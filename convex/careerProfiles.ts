import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("careerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const saveProfile = mutation({
  args: profileArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("careerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const timestamp = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: timestamp,
      });
      return existing._id;
    }

    return await ctx.db.insert("careerProfiles", {
      userId: user._id,
      ...args,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});
