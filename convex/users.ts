import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    picture: v.optional(v.string()),
    username: v.string(),
    locale: v.optional(v.string()),
    provider: v.union(
      v.literal("email"),
      v.literal("github"),
      v.literal("google"),
      v.literal("openid")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      locale: args.locale || "en-US",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

// Internal query for getting user by Clerk ID (for API routes that handle their own auth)
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
  },
});

export const updateUser = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    picture: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.username !== undefined) updates.username = args.username;
    if (args.picture !== undefined) updates.picture = args.picture;
    if (args.locale !== undefined) updates.locale = args.locale;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

export const deleteUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Delete all resumes and their statistics
    const resumes = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const resume of resumes) {
      const stats = await ctx.db
        .query("statistics")
        .withIndex("by_resume", (q) => q.eq("resumeId", resume._id))
        .first();

      if (stats) await ctx.db.delete(stats._id);
      await ctx.db.delete(resume._id);
    }

    await ctx.db.delete(user._id);
  },
});
