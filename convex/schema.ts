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
    data: v.any(), // Legacy/default-branch snapshot cache for backward compatibility.
    visibility: v.union(v.literal("private"), v.literal("public")),
    locked: v.boolean(),
    scope: v.optional(v.union(v.literal("regular"), v.literal("application_tailored"))),
    // Legacy value may point to old table IDs (e.g. `jobApplications`), so keep untyped.
    applicationId: v.optional(v.any()),
    defaultBranchId: v.optional(v.id("resumeBranches")),
    activeBranchId: v.optional(v.id("resumeBranches")),
    importState: v.optional(v.union(v.literal("pending"), v.literal("failed"))),
    importError: v.optional(v.string()),
    importFilename: v.optional(v.string()),
    importStorageId: v.optional(v.id("_storage")),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"])
    .index("by_user_scope", ["userId", "scope"])
    .index("by_user_application", ["userId", "applicationId"]),

  resumeBranches: defineTable({
    resumeId: v.id("resumes"),
    name: v.string(),
    headCommitId: v.optional(v.id("resumeCommits")),
    baseCommitId: v.optional(v.id("resumeCommits")),
    createdFromBranchId: v.optional(v.id("resumeBranches")),
    isDefault: v.boolean(),
    draftSnapshot: v.any(),
    draftHeadCommitId: v.optional(v.id("resumeCommits")),
    draftChangedPaths: v.array(v.string()),
    draftChangeSource: v.optional(v.string()),
    draftSessionStartedAt: v.optional(v.number()),
    draftUpdatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_resume", ["resumeId"])
    .index("by_resume_name", ["resumeId", "name"])
    .index("by_resume_default", ["resumeId", "isDefault"]),

  resumeCommits: defineTable({
    resumeId: v.id("resumes"),
    branchId: v.id("resumeBranches"),
    parentCommitId: v.optional(v.id("resumeCommits")),
    snapshot: v.any(),
    changeKind: v.union(v.literal("manual"), v.literal("ai"), v.literal("system")),
    changeSource: v.string(),
    message: v.string(),
    summary: v.string(),
    authorId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch", ["branchId"])
    .index("by_resume", ["resumeId"])
    .index("by_resume_created", ["resumeId", "createdAt"]),

  coverLetters: defineTable({
    userId: v.id("users"),
    applicationId: v.id("applications"),
    resumeId: v.id("resumes"),
    title: v.string(),
    slug: v.string(),
    visibility: v.union(v.literal("private"), v.literal("public")),
    preset: v.union(v.literal("balanced"), v.literal("mission_culture"), v.literal("growth_ipo")),
    focusModules: v.array(
      v.union(
        v.literal("recent_achievements"),
        v.literal("company_mission"),
        v.literal("ipo_growth_signals"),
        v.literal("future_prospects"),
        v.literal("work_culture"),
      ),
    ),
    customInstruction: v.optional(v.string()),
    activeVersion: v.number(),
    generationState: v.optional(
      v.union(v.literal("queued"), v.literal("running"), v.literal("failed")),
    ),
    generationError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_application", ["userId", "applicationId"])
    .index("by_user_slug", ["userId", "slug"]),

  coverLetterVersions: defineTable({
    // Keep legacy fields optional so older deployments can pass validation
    // while new writes continue using the normalized shape below.
    coverLetterId: v.optional(v.id("coverLetters")),
    version: v.optional(v.number()),
    contentHtml: v.optional(v.string()),
    contentText: v.optional(v.string()),
    generationContext: v.optional(v.any()),
    // Legacy shape retained for backward compatibility with existing data.
    // Legacy value may point to old table IDs (e.g. `jobApplications`), so keep untyped.
    applicationId: v.optional(v.any()),
    content: v.optional(v.string()),
    model: v.optional(v.string()),
    userId: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_cover_letter", ["coverLetterId"])
    .index("by_cover_letter_version", ["coverLetterId", "version"]),

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

  profileSuggestions: defineTable({
    userId: v.id("users"),
    sourceType: v.union(
      v.literal("resume_json_import"),
      v.literal("resume_pdf_import"),
      v.literal("resume_snapshot"),
      v.literal("application"),
    ),
    sourceId: v.string(),
    proposedPatch: v.any(),
    status: v.union(v.literal("pending"), v.literal("applied"), v.literal("dismissed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_source", ["userId", "sourceType", "sourceId"]),

  applications: defineTable({
    userId: v.id("users"),
    jobDescription: v.string(),
    title: v.string(),
    company: v.string(),
    sourceProvider: v.optional(v.union(v.literal("manual"), v.literal("theirstack"))),
    sourceJobId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourcePostedAt: v.optional(v.number()),
    sourceLocation: v.optional(v.string()),
    sourceSalaryMinUsd: v.optional(v.number()),
    sourceSalaryMaxUsd: v.optional(v.number()),
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
    extractionWarnings: v.optional(v.array(v.string())),
    tailoredResumeId: v.optional(v.id("resumes")),
    status: v.union(
      v.literal("not_applied"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offer"),
      v.literal("rejected"),
      v.literal("withdrawn"),
    ),
    extractionState: v.union(v.literal("pending"), v.literal("success"), v.literal("failed")),
    extractionError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_source_job", ["userId", "sourceProvider", "sourceJobId"]),

  jobSearchCache: defineTable({
    key: v.string(),
    mode: v.union(v.literal("count"), v.literal("preview")),
    page: v.number(),
    response: v.any(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  jobRevealCache: defineTable({
    userId: v.id("users"),
    providerJobId: v.string(),
    response: v.any(),
    searchContext: v.any(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_job", ["userId", "providerJobId"]),

  providerRateLimits: defineTable({
    provider: v.string(),
    window: v.string(),
    bucketStart: v.number(),
    count: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_provider_window_bucket", ["provider", "window", "bucketStart"]),

  aiActions: defineTable({
    userId: v.id("users"),
    kind: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("action_required"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    targetType: v.string(),
    targetId: v.string(),
    displayTitle: v.string(),
    request: v.any(),
    sourceSnapshot: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.any()),
    stagePreset: v.union(
      v.literal("applicationIntake"),
      v.literal("coverLetterCreate"),
      v.literal("coverLetterRegenerate"),
      v.literal("resumeApply"),
      v.literal("guidedAnalyze"),
      v.literal("resumePdfImport"),
    ),
    stageIndex: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_target_status", ["targetType", "targetId", "status"]),
});
