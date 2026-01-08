import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    picture: v.optional(v.string()),
    username: v.string(),
    email: v.string(),
    locale: v.string(),
    provider: v.union(
      v.literal("email"),
      v.literal("github"),
      v.literal("google"),
      v.literal("openid")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  resumes: defineTable({
    title: v.string(),
    slug: v.string(),
    data: v.any(), // Resume JSON data (same structure as current schema)
    visibility: v.union(v.literal("private"), v.literal("public")),
    locked: v.boolean(),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"]),

  statistics: defineTable({
    views: v.number(),
    downloads: v.number(),
    resumeId: v.id("resumes"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_resume", ["resumeId"]),
});
