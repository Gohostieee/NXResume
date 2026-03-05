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
      v.literal("openid"),
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
    scope: v.optional(v.union(v.literal("regular"), v.literal("application_tailored"))),
    applicationId: v.optional(v.id("applications")),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"])
    .index("by_user_scope", ["userId", "scope"])
    .index("by_user_application", ["userId", "applicationId"]),

  statistics: defineTable({
    views: v.number(),
    downloads: v.number(),
    resumeId: v.id("resumes"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_resume", ["resumeId"]),

  careerProfiles: defineTable({
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    headline: v.optional(v.string()),
    currentTitle: v.optional(v.string()),
    yearsOfExperience: v.optional(v.string()),
    websiteLinks: v.optional(v.array(v.string())),
    socialLinks: v.optional(v.array(v.string())),
    summary: v.optional(v.string()),
    experience: v.optional(
      v.array(
        v.object({
          id: v.string(),
          company: v.string(),
          title: v.string(),
          location: v.string(),
          startDate: v.string(),
          endDate: v.string(),
          summary: v.string(),
          highlights: v.array(v.string()),
        }),
      ),
    ),
    workAuthorization: v.optional(v.string()),
    desiredRoles: v.optional(v.array(v.string())),
    industries: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    tools: v.optional(v.array(v.string())),
    strengths: v.optional(v.array(v.string())),
    achievements: v.optional(v.string()),
    education: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    portfolioLinks: v.optional(v.array(v.string())),
    targetCompanies: v.optional(v.array(v.string())),
    jobTypes: v.optional(v.array(v.string())),
    workArrangement: v.optional(v.string()),
    relocation: v.optional(v.boolean()),
    salaryRange: v.optional(v.string()),
    availability: v.optional(v.string()),
    additionalContext: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  applications: defineTable({
    userId: v.id("users"),
    jobDescription: v.string(),
    title: v.string(),
    company: v.string(),
    companyResearch: v.optional(
      v.object({
        companyName: v.string(),
        shortDescription: v.string(),
        companyOverview: v.string(),
        recentEventsNews: v.string(),
        strengthsGoodAspects: v.string(),
        fundingFinancials: v.string(),
        futureOutlook: v.string(),
        missionValues: v.string(),
        otherNotablePoints: v.string(),
      }),
    ),
    categories: v.optional(v.array(v.string())),
    tailoredResumeId: v.optional(v.id("resumes")),
    status: v.union(
      v.literal("not_applied"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offer"),
      v.literal("rejected"),
      v.literal("withdrawn"),
    ),
    extractionState: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
    ),
    extractionError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
