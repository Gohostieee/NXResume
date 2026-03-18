import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const RATE_LIMIT_WINDOWS = [
  { window: "second", durationMs: 1_000, limit: 4 },
  { window: "minute", durationMs: 60_000, limit: 10 },
  { window: "hour", durationMs: 3_600_000, limit: 50 },
  { window: "day", durationMs: 86_400_000, limit: 400 },
] as const;

export const getSearchCache = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("jobSearchCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) return null;

    return entry;
  },
});

export const upsertSearchCache = internalMutation({
  args: {
    key: v.string(),
    mode: v.union(v.literal("count"), v.literal("preview")),
    page: v.number(),
    response: v.any(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobSearchCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        mode: args.mode,
        page: args.page,
        response: args.response,
        expiresAt: args.expiresAt,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("jobSearchCache", {
      key: args.key,
      mode: args.mode,
      page: args.page,
      response: args.response,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getRevealCache = internalQuery({
  args: {
    userId: v.id("users"),
    providerJobId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("jobRevealCache")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", args.userId).eq("providerJobId", args.providerJobId),
      )
      .first();

    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) return null;

    return entry;
  },
});

export const upsertRevealCache = internalMutation({
  args: {
    userId: v.id("users"),
    providerJobId: v.string(),
    response: v.any(),
    searchContext: v.any(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobRevealCache")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", args.userId).eq("providerJobId", args.providerJobId),
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        response: args.response,
        searchContext: args.searchContext,
        expiresAt: args.expiresAt,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("jobRevealCache", {
      userId: args.userId,
      providerJobId: args.providerJobId,
      response: args.response,
      searchContext: args.searchContext,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const reserveProviderRateLimit = internalMutation({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingRows = await Promise.all(
      RATE_LIMIT_WINDOWS.map(({ window, durationMs }) => {
        const bucketStart = Math.floor(now / durationMs) * durationMs;
        return ctx.db
          .query("providerRateLimits")
          .withIndex("by_provider_window_bucket", (q) =>
            q.eq("provider", args.provider).eq("window", window).eq("bucketStart", bucketStart),
          )
          .first();
      }),
    );

    for (let index = 0; index < RATE_LIMIT_WINDOWS.length; index += 1) {
      const currentWindow = RATE_LIMIT_WINDOWS[index];
      const row = existingRows[index];

      if (row && row.count >= currentWindow.limit) {
        const retryAfterMs =
          Math.floor(now / currentWindow.durationMs) * currentWindow.durationMs +
          currentWindow.durationMs -
          now;

        return {
          allowed: false,
          retryAfterMs: Math.max(retryAfterMs, 250),
          window: currentWindow.window,
        };
      }
    }

    await Promise.all(
      RATE_LIMIT_WINDOWS.map(async ({ window, durationMs }) => {
        const bucketStart = Math.floor(now / durationMs) * durationMs;
        const row = existingRows.find(
          (entry) => entry?.window === window && entry.bucketStart === bucketStart,
        );

        if (row) {
          await ctx.db.patch(row._id, {
            count: row.count + 1,
            expiresAt: bucketStart + durationMs,
            updatedAt: now,
          });
          return;
        }

        await ctx.db.insert("providerRateLimits", {
          provider: args.provider,
          window,
          bucketStart,
          count: 1,
          expiresAt: bucketStart + durationMs,
          createdAt: now,
          updatedAt: now,
        });
      }),
    );

    return {
      allowed: true,
      retryAfterMs: 0,
      window: null,
    };
  },
});
