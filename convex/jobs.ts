"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import {
  JOBS_PAGE_SIZE,
  buildJobSearchContext,
  compileJobCountQuery,
  compileJobPreviewQuery,
  compileJobRevealQuery,
} from "../lib/jobs/compiler";
import { mapCountResult, mapCreditStatus, mapPreviewResult, mapRevealResult } from "../lib/jobs/provider";
import type {
  JobCreditStatus,
  JobReveal,
  JobSearchContext,
  JobSearchCountResult,
  JobSearchPreviewResult,
} from "../lib/jobs/types";

const THEIRSTACK_API_BASE_URL =
  process.env.THEIRSTACK_API_BASE_URL?.trim() || "https://api.theirstack.com";
const COUNT_CACHE_TTL_MS = 120_000;
const PREVIEW_CACHE_TTL_MS = 120_000;
const REVEAL_CACHE_TTL_MS = 86_400_000;

class TheirStackApiError extends Error {
  status: number;
  retryAfterMs: number;

  constructor(message: string, status: number, retryAfterMs = 0) {
    super(message);
    this.name = "TheirStackApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const requireTheirStackApiKey = () => {
  const apiKey = process.env.THEIRSTACK_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("TheirStack API key is not configured on the server.");
  }

  return apiKey;
};

const getRetryAfterMs = (response: Response) => {
  const retryAfterHeader = response.headers.get("Retry-After");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }

  const resetHeader = response.headers.get("RateLimit-Reset");
  if (!resetHeader) return 0;

  const firstWindow = resetHeader.split(",")[0]?.trim();
  const seconds = Number(firstWindow);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 0;
};

const wait = async (durationMs: number) =>
  await new Promise((resolve) => setTimeout(resolve, durationMs));

const requireUser = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  const user = await ctx.runQuery(api.users.getByClerkId, {
    clerkId: identity.subject,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const hashQueryKey = (queryKey: string) =>
  createHash("sha256").update(queryKey).digest("hex");

const reserveProviderCapacity = async (ctx: any) => {
  const reservation = await ctx.runMutation(internal.jobsStore.reserveProviderRateLimit, {
    provider: "theirstack",
  });

  if (!reservation.allowed) {
    throw new TheirStackApiError(
      "The job search provider is rate-limited. Please try again shortly.",
      429,
      reservation.retryAfterMs,
    );
  }
};

const fetchTheirStack = async (
  ctx: any,
  path: string,
  init: RequestInit,
): Promise<Record<string, unknown> | Array<Record<string, unknown>>> => {
  const apiKey = requireTheirStackApiKey();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await reserveProviderCapacity(ctx);

    const response = await fetch(`${THEIRSTACK_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    const responseText = await response.text();
    const payload = responseText.length > 0 ? JSON.parse(responseText) : {};

    if (response.ok) {
      return payload;
    }

    if (response.status === 429 && attempt < 2) {
      const retryAfterMs = Math.max(getRetryAfterMs(response), 500 * (attempt + 1));
      await wait(retryAfterMs);
      continue;
    }

    const errorPayload = ((payload as Record<string, unknown>).error ?? {}) as Record<
      string,
      unknown
    >;
    const message =
      normalizeText(errorPayload.description) ||
      normalizeText(errorPayload.title) ||
      `TheirStack request failed with status ${response.status}.`;

    throw new TheirStackApiError(message, response.status, getRetryAfterMs(response));
  }

  throw new Error("TheirStack request failed after multiple retries.");
};

const fetchTheirStackSearch = async (
  ctx: any,
  payload: Record<string, unknown>,
) =>
  (await fetchTheirStack(ctx, "/v1/jobs/search", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as Record<string, unknown>;

const fetchCreditStatus = async (ctx: any): Promise<JobCreditStatus> => {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 86_400_000);

  const [balanceResponse, consumptionResponse] = await Promise.all([
    fetchTheirStack(ctx, "/v0/billing/credit-balance", {
      method: "GET",
    }),
    fetchTheirStack(
      ctx,
      `/v0/teams/credits_consumption?start_datetime=${encodeURIComponent(start.toISOString())}&end_datetime=${encodeURIComponent(end.toISOString())}&timezone=${encodeURIComponent("America/New_York")}`,
      {
        method: "GET",
      },
    ),
  ]);

  return mapCreditStatus(
    balanceResponse as Record<string, unknown>,
    Array.isArray(consumptionResponse) ? consumptionResponse : [],
  );
};

export const count = action({
  args: {
    intent: v.any(),
  },
  handler: async (ctx, args): Promise<JobSearchCountResult> => {
    await requireUser(ctx);

    const compiledQuery = compileJobCountQuery(args.intent);
    const queryHash = hashQueryKey(compiledQuery.queryKey);
    const cacheKey = `count:${queryHash}`;

    const cached = await ctx.runQuery(internal.jobsStore.getSearchCache, {
      key: cacheKey,
    });

    if (cached) {
      return cached.response as JobSearchCountResult;
    }

    const response = await fetchTheirStackSearch(ctx, compiledQuery.payload);
    const searchContext = buildJobSearchContext(queryHash, compiledQuery);
    const result = mapCountResult(response as any, queryHash, searchContext);

    await ctx.runMutation(internal.jobsStore.upsertSearchCache, {
      key: cacheKey,
      mode: "count",
      page: 0,
      response: result,
      expiresAt: Date.now() + COUNT_CACHE_TTL_MS,
    });

    return result;
  },
});

export const preview = action({
  args: {
    intent: v.any(),
    page: v.number(),
  },
  handler: async (ctx, args): Promise<JobSearchPreviewResult> => {
    await requireUser(ctx);

    const page = Math.max(0, args.page);
    const compiledQuery = compileJobPreviewQuery(args.intent, page);
    const queryHash = hashQueryKey(compiledQuery.queryKey);
    const cacheKey = `preview:${queryHash}:page:${page}`;

    const cached = await ctx.runQuery(internal.jobsStore.getSearchCache, {
      key: cacheKey,
    });

    if (cached) {
      return cached.response as JobSearchPreviewResult;
    }

    const response = await fetchTheirStackSearch(ctx, compiledQuery.payload);
    const searchContext = buildJobSearchContext(queryHash, compiledQuery);
    const result = mapPreviewResult(
      response as any,
      page,
      queryHash,
      searchContext,
      JOBS_PAGE_SIZE,
    );

    await ctx.runMutation(internal.jobsStore.upsertSearchCache, {
      key: cacheKey,
      mode: "preview",
      page,
      response: result,
      expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
    });

    return result;
  },
});

export const reveal = action({
  args: {
    jobId: v.string(),
    searchContext: v.any(),
  },
  handler: async (ctx, args): Promise<JobReveal> => {
    const user = await requireUser(ctx);

    const cached = await ctx.runQuery(internal.jobsStore.getRevealCache, {
      userId: user._id,
      providerJobId: args.jobId,
    });

    if (cached) {
      return cached.response as JobReveal;
    }

    const compiledQuery = compileJobRevealQuery(args.jobId, args.searchContext);
    const response = await fetchTheirStackSearch(ctx, compiledQuery.payload);
    const data = Array.isArray((response as Record<string, unknown>).data)
      ? (((response as Record<string, unknown>).data as unknown[]) as Record<string, unknown>[])
      : [];
    const firstJob = data.length > 0 ? data[0] : null;

    if (!firstJob) {
      throw new Error("This job could not be revealed.");
    }

    const result = mapRevealResult(firstJob);

    await ctx.runMutation(internal.jobsStore.upsertRevealCache, {
      userId: user._id,
      providerJobId: args.jobId,
      response: result,
      searchContext: args.searchContext,
      expiresAt: Date.now() + REVEAL_CACHE_TTL_MS,
    });

    return result;
  },
});

export const getCreditStatus = action({
  args: {},
  handler: async (ctx): Promise<JobCreditStatus> => {
    await requireUser(ctx);
    return await fetchCreditStatus(ctx);
  },
});

export const importToApplications = action({
  args: {
    revealedJob: v.any(),
    searchContext: v.any(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    id: string;
    created: boolean;
    queuedExtraction: boolean;
    href: string;
    searchContext: JobSearchContext;
  }> => {
    const revealedJob = (args.revealedJob ?? {}) as JobReveal;

    if (!normalizeText(revealedJob.jobId)) {
      throw new Error("A revealed job is required before importing.");
    }

    const sourcePostedAt = normalizeText(revealedJob.postedDate)
      ? Date.parse(revealedJob.postedDate)
      : Number.NaN;

    const importResult = (await ctx.runMutation(
      api.applications.createFromJobReveal,
      {
      sourceJobId: normalizeText(revealedJob.jobId),
      sourceUrl: normalizeText(revealedJob.applyUrl) || normalizeText(revealedJob.sourceUrl) || undefined,
      sourcePostedAt: Number.isFinite(sourcePostedAt) ? sourcePostedAt : undefined,
      sourceLocation: normalizeText(revealedJob.location) || undefined,
      sourceSalaryMinUsd: revealedJob.minSalaryUsd ?? undefined,
      sourceSalaryMaxUsd: revealedJob.maxSalaryUsd ?? undefined,
      jobDescription: normalizeText(revealedJob.description),
        title: normalizeText(revealedJob.title),
        company: normalizeText(revealedJob.company),
      },
    )) as { id: any; created: boolean };

    let queuedExtraction = false;

    if (importResult.created) {
      try {
        await ctx.runMutation(api.aiQueue.enqueue, {
          request: {
            kind: "application.extract",
            applicationId: importResult.id,
          },
        });
        queuedExtraction = true;
      } catch (error) {
        await ctx.runMutation(api.applications.retryExtraction, {
          id: importResult.id,
          title: normalizeText(revealedJob.title),
          company: normalizeText(revealedJob.company),
          categories: [],
          extractionState: "failed",
          extractionError:
            error instanceof Error
              ? error.message
              : "AI extraction could not be queued after importing the job.",
        });
      }
    }

    return {
      ...importResult,
      queuedExtraction,
      href: `/dashboard/applications?applicationId=${importResult.id}`,
      searchContext: args.searchContext as JobSearchContext,
    };
  },
});
