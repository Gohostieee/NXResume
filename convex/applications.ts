import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const MAX_CATEGORIES = 10;
const UNKNOWN_TITLE = "Unknown Title";
const UNKNOWN_COMPANY = "Unknown Company";

const extractionState = v.union(
  v.literal("pending"),
  v.literal("success"),
  v.literal("failed"),
);

const applicationStatus = v.union(
  v.literal("not_applied"),
  v.literal("applied"),
  v.literal("interviewing"),
  v.literal("offer"),
  v.literal("rejected"),
  v.literal("withdrawn"),
);

const normalizeText = (value: string) => value.trim();

const normalizeBoundedDescription = (value: string) => {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    throw new Error("Job description is required");
  }
  if (trimmed.length > MAX_JOB_DESCRIPTION_LENGTH) {
    throw new Error(`Job description must be ${MAX_JOB_DESCRIPTION_LENGTH} characters or less`);
  }
  return trimmed;
};

const normalizeName = (value: string | undefined, fallback: string) => {
  const trimmed = normalizeText(value ?? "");
  return trimmed || fallback;
};

const normalizeCategories = (values: string[] | undefined) => {
  const normalized = (values ?? [])
    .map((value) => normalizeText(value).toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, MAX_CATEGORIES);

  return Array.from(new Set(normalized));
};

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const createFromIntake = mutation({
  args: {
    jobDescription: v.string(),
    title: v.string(),
    company: v.string(),
    categories: v.optional(v.array(v.string())),
    extractionState,
    extractionError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();

    const extractionError = normalizeText(args.extractionError ?? "");

    return await ctx.db.insert("applications", {
      userId: user._id,
      jobDescription: normalizeBoundedDescription(args.jobDescription),
      title: normalizeName(args.title, UNKNOWN_TITLE),
      company: normalizeName(args.company, UNKNOWN_COMPANY),
      categories: normalizeCategories(args.categories),
      status: "not_applied",
      extractionState: args.extractionState,
      extractionError: extractionError || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("applications"),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    status: v.optional(applicationStatus),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const application = await ctx.db.get(args.id);

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const patchData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      patchData.title = normalizeName(args.title, UNKNOWN_TITLE);
    }

    if (args.company !== undefined) {
      patchData.company = normalizeName(args.company, UNKNOWN_COMPANY);
    }

    if (args.categories !== undefined) {
      patchData.categories = normalizeCategories(args.categories);
    }

    if (args.status !== undefined) {
      patchData.status = args.status;
    }

    await ctx.db.patch(args.id, patchData);
    return args.id;
  },
});

export const retryExtraction = mutation({
  args: {
    id: v.id("applications"),
    title: v.string(),
    company: v.string(),
    categories: v.optional(v.array(v.string())),
    extractionState,
    extractionError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const application = await ctx.db.get(args.id);

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const extractionError = normalizeText(args.extractionError ?? "");

    await ctx.db.patch(args.id, {
      title: normalizeName(args.title, UNKNOWN_TITLE),
      company: normalizeName(args.company, UNKNOWN_COMPANY),
      categories: normalizeCategories(args.categories),
      extractionState: args.extractionState,
      extractionError: extractionError || undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const application = await ctx.db.get(id);

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(id);
  },
});
