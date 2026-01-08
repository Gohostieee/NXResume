import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByResumeId = query({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, { resumeId }) => {
    const stats = await ctx.db
      .query("statistics")
      .withIndex("by_resume", (q) => q.eq("resumeId", resumeId))
      .first();

    return {
      views: stats?.views ?? 0,
      downloads: stats?.downloads ?? 0,
    };
  },
});

export const incrementViews = mutation({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, { resumeId }) => {
    const stats = await ctx.db
      .query("statistics")
      .withIndex("by_resume", (q) => q.eq("resumeId", resumeId))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        views: stats.views + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("statistics", {
        resumeId,
        views: 1,
        downloads: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const incrementDownloads = mutation({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, { resumeId }) => {
    const stats = await ctx.db
      .query("statistics")
      .withIndex("by_resume", (q) => q.eq("resumeId", resumeId))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        downloads: stats.downloads + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("statistics", {
        resumeId,
        views: 0,
        downloads: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
