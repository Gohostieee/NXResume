import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  PROFILE_FIELD_LABELS,
  sanitizeCareerProfilePatch,
  type CareerProfilePatch,
} from "../lib/profile/context";
import { buildProfilePatchFromResume } from "../lib/profile/suggestions";
import {
  applySuggestionPatch,
  buildSuggestionView,
  getCareerProfileContextByUserId,
  getCurrentUserByIdentity,
  getPendingProfileSuggestionsByUserId,
  upsertProfileSuggestion,
} from "./profileSupport";
import { resolveDefaultResumeSnapshot } from "./resumeHistory";

const experienceItem = v.object({
  id: v.string(),
  company: v.string(),
  title: v.string(),
  location: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  summary: v.string(),
  highlights: v.array(v.string()),
});

const profileArgs = {
  fullName: v.string(),
  email: v.string(),
  phone: v.string(),
  location: v.string(),
  headline: v.string(),
  currentTitle: v.string(),
  yearsOfExperience: v.string(),
  websiteLinks: v.array(v.string()),
  socialLinks: v.array(v.string()),
  summary: v.string(),
  experience: v.array(experienceItem),
  workAuthorization: v.string(),
  desiredRoles: v.array(v.string()),
  industries: v.array(v.string()),
  skills: v.array(v.string()),
  tools: v.array(v.string()),
  strengths: v.array(v.string()),
  achievements: v.string(),
  education: v.string(),
  certifications: v.array(v.string()),
  portfolioLinks: v.array(v.string()),
  targetCompanies: v.array(v.string()),
  jobTypes: v.array(v.string()),
  workArrangement: v.string(),
  relocation: v.boolean(),
  salaryRange: v.string(),
  availability: v.string(),
  additionalContext: v.string(),
};

export const getCurrentProfile = query({
  handler: async (ctx) => {
    const user = await getCurrentUserByIdentity(ctx);
    if (!user) return null;

    return await ctx.db
      .query("careerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const getContext = query({
  handler: async (ctx) => {
    const user = await getCurrentUserByIdentity(ctx);
    if (!user) return null;

    return await getCareerProfileContextByUserId(ctx, user._id);
  },
});

export const listSuggestions = query({
  handler: async (ctx) => {
    const user = await getCurrentUserByIdentity(ctx);
    if (!user) return [];

    const profileContext = await getCareerProfileContextByUserId(ctx, user._id);
    const suggestions = await getPendingProfileSuggestionsByUserId(ctx, user._id);

    return suggestions.map((suggestion: any) => ({
      ...buildSuggestionView(suggestion, profileContext.profile),
      fieldLabels: PROFILE_FIELD_LABELS,
    }));
  },
});

export const saveProfile = mutation({
  args: profileArgs,
  handler: async (ctx, args) => {
    const user = await getCurrentUserByIdentity(ctx);
    if (!user) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("careerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const timestamp = Date.now();
    const nextProfile = sanitizeCareerProfilePatch(args as CareerProfilePatch);

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...nextProfile,
        updatedAt: timestamp,
      });
      return existing._id;
    }

    return await ctx.db.insert("careerProfiles", {
      userId: user._id,
      ...nextProfile,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const applySuggestion = mutation({
  args: {
    suggestionId: v.id("profileSuggestions"),
    selectedFields: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserByIdentity(ctx);
    if (!user) throw new Error("Unauthorized");

    return await applySuggestionPatch(ctx, {
      userId: user._id,
      suggestionId: args.suggestionId,
      selectedFields: args.selectedFields,
    });
  },
});

export const dismissSuggestion = mutation({
  args: {
    suggestionId: v.id("profileSuggestions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserByIdentity(ctx);
    if (!user) throw new Error("Unauthorized");

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) return null;
    if (suggestion.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.suggestionId, {
      status: "dismissed",
      updatedAt: Date.now(),
    });

    return args.suggestionId;
  },
});

export const importFromResume = mutation({
  args: {
    resumeId: v.id("resumes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserByIdentity(ctx);
    if (!user) throw new Error("Unauthorized");

    const resume = await ctx.db.get(args.resumeId);
    if (!resume) throw new Error("Resume not found");
    if (resume.userId !== user._id) throw new Error("Unauthorized");

    const { snapshot } = await resolveDefaultResumeSnapshot(ctx, resume);

    return await upsertProfileSuggestion(ctx, {
      userId: user._id,
      sourceType: "resume_snapshot",
      sourceId: resume._id,
      proposedPatch: buildProfilePatchFromResume(snapshot.data),
    });
  },
});
