import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  buildCareerProfileContext,
  getPatchConflictKeys,
  getPatchFieldKeys,
  mergeCareerProfilePatch,
  normalizeCareerProfile,
  pickCareerProfilePatch,
  sanitizeCareerProfilePatch,
  type CareerProfileContext,
  type CareerProfilePatch,
} from "../lib/profile/context";
import type { ProfileSuggestionSourceType } from "../lib/profile/suggestions";

type AnyCtx = QueryCtx | MutationCtx | any;

export const getCurrentUserByIdentity = async (ctx: AnyCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();
};

export const getCareerProfileByUserId = async (ctx: AnyCtx, userId: Id<"users">) =>
  await ctx.db
    .query("careerProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

export const getPendingProfileSuggestionsByUserId = async (ctx: AnyCtx, userId: Id<"users">) =>
  await ctx.db
    .query("profileSuggestions")
    .withIndex("by_user_status", (q: any) => q.eq("userId", userId).eq("status", "pending"))
    .order("desc")
    .collect();

export const getCareerProfileContextByUserId = async (
  ctx: AnyCtx,
  userId: Id<"users">,
): Promise<CareerProfileContext> => {
  const profile = await getCareerProfileByUserId(ctx, userId);
  return buildCareerProfileContext(profile);
};

export const upsertProfileSuggestion = async (
  ctx: MutationCtx | any,
  args: {
    userId: Id<"users">;
    sourceType: ProfileSuggestionSourceType;
    sourceId: string;
    proposedPatch: CareerProfilePatch;
  },
) => {
  const proposedPatch = sanitizeCareerProfilePatch(args.proposedPatch);
  if (getPatchFieldKeys(proposedPatch).length === 0) {
    return null;
  }

  const now = Date.now();
  const existing = await ctx.db
    .query("profileSuggestions")
    .withIndex("by_user_source", (q: any) =>
      q.eq("userId", args.userId).eq("sourceType", args.sourceType).eq("sourceId", args.sourceId),
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      proposedPatch,
      status: "pending",
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("profileSuggestions", {
    userId: args.userId,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
    proposedPatch,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
};

export const buildSuggestionView = (
  suggestion: Doc<"profileSuggestions">,
  currentProfile: ReturnType<typeof normalizeCareerProfile>,
) => {
  const proposedPatch = sanitizeCareerProfilePatch(suggestion.proposedPatch);
  const conflictKeys = getPatchConflictKeys(currentProfile, proposedPatch);
  const suggestedKeys = getPatchFieldKeys(proposedPatch);
  const defaultSelectedFields = suggestedKeys.filter((key) => !conflictKeys.includes(key));

  return {
    ...suggestion,
    proposedPatch,
    suggestedFields: suggestedKeys,
    conflictingFields: conflictKeys,
    defaultSelectedFields,
  };
};

export const applySuggestionPatch = async (
  ctx: MutationCtx | any,
  args: {
    userId: Id<"users">;
    suggestionId: Id<"profileSuggestions">;
    selectedFields: string[];
  },
) => {
  const suggestion = await ctx.db.get(args.suggestionId);
  if (!suggestion) {
    throw new Error("Suggestion not found");
  }
  if (suggestion.userId !== args.userId) {
    throw new Error("Unauthorized");
  }
  if (suggestion.status !== "pending") {
    throw new Error("Suggestion is no longer pending");
  }

  const existingProfile = await getCareerProfileByUserId(ctx, args.userId);
  const currentProfile = normalizeCareerProfile(existingProfile);
  const selectedPatch = pickCareerProfilePatch(
    suggestion.proposedPatch,
    args.selectedFields as Array<keyof typeof currentProfile>,
  );

  if (getPatchFieldKeys(selectedPatch).length === 0) {
    throw new Error("Choose at least one field to apply.");
  }

  const mergedProfile = mergeCareerProfilePatch(currentProfile, selectedPatch);
  const now = Date.now();

  if (existingProfile) {
    await ctx.db.patch(existingProfile._id, {
      ...mergedProfile,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("careerProfiles", {
      userId: args.userId,
      ...mergedProfile,
      createdAt: now,
      updatedAt: now,
    });
  }

  await ctx.db.patch(suggestion._id, {
    status: "applied",
    updatedAt: now,
  });

  return suggestion._id;
};
