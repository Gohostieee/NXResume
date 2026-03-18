import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { buildProfilePatchFromApplication } from "../lib/profile/suggestions";
import {
  createInitialResumeHistory,
  deleteResumeHistory,
  getResumeSnapshotPatch,
  resolveDefaultResumeSnapshot,
  type ResumeVersionSnapshot,
} from "./resumeHistory";
import { upsertProfileSuggestion } from "./profileSupport";

const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const MAX_CATEGORIES = 10;
const UNKNOWN_TITLE = "Unknown Title";
const UNKNOWN_COMPANY = "Unknown Company";
const NO_SIGNIFICANT_INFORMATION = "No significant information found.";

const extractionState = v.union(v.literal("pending"), v.literal("success"), v.literal("failed"));

const applicationStatus = v.union(
  v.literal("not_applied"),
  v.literal("applied"),
  v.literal("interviewing"),
  v.literal("offer"),
  v.literal("rejected"),
  v.literal("withdrawn"),
);

const companyResearchValidator = v.object({
  companyName: v.string(),
  shortDescription: v.string(),
  companyOverview: v.string(),
  recentEventsNews: v.string(),
  strengthsGoodAspects: v.string(),
  fundingFinancials: v.string(),
  futureOutlook: v.string(),
  missionValues: v.string(),
  otherNotablePoints: v.string(),
});

type CompanyResearchInput = {
  companyName: string;
  shortDescription: string;
  companyOverview: string;
  recentEventsNews: string;
  strengthsGoodAspects: string;
  fundingFinancials: string;
  futureOutlook: string;
  missionValues: string;
  otherNotablePoints: string;
};

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

const normalizeImportedDescription = (value: string) => {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    throw new Error("Job description is required");
  }

  if (trimmed.length <= MAX_JOB_DESCRIPTION_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_JOB_DESCRIPTION_LENGTH - 3).trimEnd()}...`;
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

const normalizeWarnings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => normalizeText(value)).filter(Boolean)));

const normalizeResearchText = (value: string | undefined) =>
  normalizeName(value, NO_SIGNIFICANT_INFORMATION);

const normalizeCompanyResearch = (value: CompanyResearchInput | undefined) => {
  if (!value) return undefined;

  return {
    companyName: normalizeName(value.companyName, UNKNOWN_COMPANY),
    shortDescription: normalizeResearchText(value.shortDescription),
    companyOverview: normalizeResearchText(value.companyOverview),
    recentEventsNews: normalizeResearchText(value.recentEventsNews),
    strengthsGoodAspects: normalizeResearchText(value.strengthsGoodAspects),
    fundingFinancials: normalizeResearchText(value.fundingFinancials),
    futureOutlook: normalizeResearchText(value.futureOutlook),
    missionValues: normalizeResearchText(value.missionValues),
    otherNotablePoints: normalizeResearchText(value.otherNotablePoints),
  };
};

const defaultResumeData = {
  basics: {
    name: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    url: { label: "", href: "" },
    customFields: [],
    picture: {
      url: "",
      size: 64,
      aspectRatio: 1,
      borderRadius: 0,
      effects: { hidden: false, border: false, grayscale: false },
    },
  },
  sections: {
    summary: {
      id: "summary",
      name: "Summary",
      columns: 1,
      separateLinks: true,
      visible: true,
      content: "",
    },
    awards: {
      id: "awards",
      name: "Awards",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    certifications: {
      id: "certifications",
      name: "Certifications",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    education: {
      id: "education",
      name: "Education",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    experience: {
      id: "experience",
      name: "Experience",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    volunteer: {
      id: "volunteer",
      name: "Volunteering",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    interests: {
      id: "interests",
      name: "Interests",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    languages: {
      id: "languages",
      name: "Languages",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    profiles: {
      id: "profiles",
      name: "Profiles",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    projects: {
      id: "projects",
      name: "Projects",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    publications: {
      id: "publications",
      name: "Publications",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    references: {
      id: "references",
      name: "References",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    skills: {
      id: "skills",
      name: "Skills",
      columns: 1,
      separateLinks: true,
      visible: true,
      items: [],
    },
    custom: {},
  },
  metadata: {
    template: "harvard",
    layout: [
      [
        ["profiles", "summary", "experience", "education", "projects", "volunteer", "references"],
        ["skills", "interests", "certifications", "awards", "publications", "languages"],
      ],
    ],
    css: { value: "", visible: false },
    page: { margin: 18, format: "a4", options: { breakLine: true, pageNumbers: true } },
    theme: { background: "#ffffff", text: "#000000", primary: "#dc2626" },
    typography: {
      font: {
        family: "IBM Plex Sans",
        subset: "latin",
        variants: ["regular", "italic", "600"],
        size: 14,
      },
      lineHeight: 1.5,
      hideIcons: false,
      underlineLinks: true,
    },
    notes: "",
  },
};

const cloneResumeData = <T>(data: T): T => JSON.parse(JSON.stringify(data));

const buildDefaultResumeDataForUser = (user: { name: string; email: string; picture?: string }) => {
  const data = cloneResumeData(defaultResumeData);
  data.basics.name = user.name;
  data.basics.email = user.email;
  data.basics.picture.url = user.picture ?? "";
  return data;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const generateUniqueSlug = async (ctx: any, userId: any, base: string) => {
  const root = slugify(base) || "resume";
  let candidate = root;
  let counter = 1;

  while (true) {
    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_user_slug", (q: any) => q.eq("userId", userId).eq("slug", candidate))
      .first();

    if (!existing) return candidate;
    candidate = `${root}-${counter}`;
    counter += 1;
  }
};

const removeResumeAndStats = async (ctx: any, resumeId: any) => {
  const stats = await ctx.db
    .query("statistics")
    .withIndex("by_resume", (q: any) => q.eq("resumeId", resumeId))
    .first();

  if (stats) {
    await ctx.db.delete(stats._id);
  }

  await deleteResumeHistory(ctx, resumeId);
  await ctx.db.delete(resumeId);
};

const removeCoverLetterAndVersions = async (ctx: any, coverLetterId: any) => {
  const versions = await ctx.db
    .query("coverLetterVersions")
    .withIndex("by_cover_letter", (q: any) => q.eq("coverLetterId", coverLetterId))
    .collect();

  for (const version of versions) {
    await ctx.db.delete(version._id);
  }

  const queueItems = await ctx.db
    .query("aiActions")
    .withIndex("by_target", (q: any) => q.eq("targetType", "cover_letter").eq("targetId", coverLetterId))
    .collect();

  for (const item of queueItems) {
    await ctx.db.delete(item._id);
  }

  await ctx.db.delete(coverLetterId);
};

const removeCoverLettersForApplication = async (ctx: any, userId: any, applicationId: any) => {
  const coverLetters = await ctx.db
    .query("coverLetters")
    .withIndex("by_user_application", (q: any) =>
      q.eq("userId", userId).eq("applicationId", applicationId),
    )
    .collect();

  for (const coverLetter of coverLetters) {
    await removeCoverLetterAndVersions(ctx, coverLetter._id);
  }
};

const listTailoredResumesForApplication = async (ctx: any, userId: any, applicationId: any) => {
  const resumes = await ctx.db
    .query("resumes")
    .withIndex("by_user_application", (q: any) =>
      q.eq("userId", userId).eq("applicationId", applicationId),
    )
    .collect();

  return resumes.filter((resume: any) => resume.scope === "application_tailored");
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

export const getById = query({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const application = await ctx.db.get(id);
    if (!application) return null;
    if (application.userId !== user._id) return null;

    return application;
  },
});

export const createFromIntake = mutation({
  args: {
    jobDescription: v.string(),
    title: v.string(),
    company: v.string(),
    companyResearch: v.optional(companyResearchValidator),
    categories: v.optional(v.array(v.string())),
    extractionWarnings: v.optional(v.array(v.string())),
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
      sourceProvider: "manual",
      companyResearch: normalizeCompanyResearch(args.companyResearch),
      categories: normalizeCategories(args.categories),
      extractionWarnings: normalizeWarnings(args.extractionWarnings),
      status: "not_applied",
      extractionState: args.extractionState,
      extractionError: extractionError || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createPendingFromIntake = mutation({
  args: {
    jobDescription: v.string(),
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

    return await ctx.db.insert("applications", {
      userId: user._id,
      jobDescription: normalizeBoundedDescription(args.jobDescription),
      title: UNKNOWN_TITLE,
      company: UNKNOWN_COMPANY,
      sourceProvider: "manual",
      companyResearch: undefined,
      categories: [],
      extractionWarnings: undefined,
      status: "not_applied",
      extractionState: "pending",
      extractionError: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createFromJobReveal = mutation({
  args: {
    sourceJobId: v.string(),
    sourceUrl: v.optional(v.string()),
    sourcePostedAt: v.optional(v.number()),
    sourceLocation: v.optional(v.string()),
    sourceSalaryMinUsd: v.optional(v.number()),
    sourceSalaryMaxUsd: v.optional(v.number()),
    jobDescription: v.string(),
    title: v.string(),
    company: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_user_source_job", (q) =>
        q.eq("userId", user._id).eq("sourceProvider", "theirstack").eq("sourceJobId", args.sourceJobId),
      )
      .first();

    if (existing) {
      return {
        id: existing._id,
        created: false,
      };
    }

    const now = Date.now();
    const id = await ctx.db.insert("applications", {
      userId: user._id,
      jobDescription: normalizeImportedDescription(args.jobDescription),
      title: normalizeName(args.title, UNKNOWN_TITLE),
      company: normalizeName(args.company, UNKNOWN_COMPANY),
      sourceProvider: "theirstack",
      sourceJobId: normalizeText(args.sourceJobId),
      sourceUrl: normalizeText(args.sourceUrl ?? "") || undefined,
      sourcePostedAt: args.sourcePostedAt,
      sourceLocation: normalizeText(args.sourceLocation ?? "") || undefined,
      sourceSalaryMinUsd: args.sourceSalaryMinUsd,
      sourceSalaryMaxUsd: args.sourceSalaryMaxUsd,
      companyResearch: undefined,
      categories: [],
      extractionWarnings: undefined,
      status: "not_applied",
      extractionState: "pending",
      extractionError: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      created: true,
    };
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

    const isFieldEdit =
      args.title !== undefined || args.company !== undefined || args.categories !== undefined;
    if (application.extractionState === "pending" && isFieldEdit) {
      throw new Error("Wait for AI extraction to finish before editing these fields.");
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

export const assignTailoredResume = mutation({
  args: {
    applicationId: v.id("applications"),
    mode: v.union(v.literal("base"), v.literal("new")),
    baseResumeId: v.optional(v.id("resumes")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");
    if (application.userId !== user._id) throw new Error("Unauthorized");

    let baseResume: any = null;
    let baseSnapshot: ResumeVersionSnapshot | null = null;
    if (args.mode === "base") {
      if (!args.baseResumeId) {
        throw new Error("Base resume is required for base mode");
      }

      baseResume = await ctx.db.get(args.baseResumeId);
      if (!baseResume) throw new Error("Resume not found");
      if (baseResume.userId !== user._id) throw new Error("Unauthorized");
      if (baseResume.scope === "application_tailored") {
        throw new Error("Base resume must be a regular resume");
      }

      baseSnapshot = (await resolveDefaultResumeSnapshot(ctx, baseResume)).snapshot;
    }

    const now = Date.now();
    const title =
      args.mode === "base"
        ? `${baseResume.title} (${application.company} - Tailored)`
        : `${application.title} @ ${application.company} (Tailored)`;
    const slug = await generateUniqueSlug(ctx, user._id, title);
    const snapshot: ResumeVersionSnapshot =
      args.mode === "base" && baseSnapshot
        ? {
            title,
            visibility: "private",
            data: JSON.parse(JSON.stringify(baseSnapshot.data)),
          }
        : {
            title,
            visibility: "private",
            data: buildDefaultResumeDataForUser({
              name: user.name,
              email: user.email,
              picture: user.picture,
            }),
          };

    const tailoredResumeId = await ctx.db.insert("resumes", {
      ...getResumeSnapshotPatch(snapshot),
      slug,
      locked: false,
      scope: "application_tailored",
      applicationId: application._id,
      defaultBranchId: undefined,
      activeBranchId: undefined,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statistics", {
      resumeId: tailoredResumeId,
      views: 0,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(application._id, {
      tailoredResumeId,
      updatedAt: now,
    });

    await createInitialResumeHistory(ctx, {
      resumeId: tailoredResumeId,
      userId: user._id,
      snapshot,
      changeSource: "tailored_seed",
      createdAt: now,
    });

    return tailoredResumeId;
  },
});

export const retryExtraction = mutation({
  args: {
    id: v.id("applications"),
    title: v.string(),
    company: v.string(),
    companyResearch: v.optional(companyResearchValidator),
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

    const patchData: Record<string, unknown> = {
      title: normalizeName(args.title, UNKNOWN_TITLE),
      company: normalizeName(args.company, UNKNOWN_COMPANY),
      categories: normalizeCategories(args.categories),
      extractionState: args.extractionState,
      extractionError: extractionError || undefined,
      updatedAt: Date.now(),
    };

    if (args.companyResearch !== undefined) {
      patchData.companyResearch = normalizeCompanyResearch(args.companyResearch);
    }

    await ctx.db.patch(args.id, patchData);

    return args.id;
  },
});

export const markExtractionPending = mutation({
  args: {
    id: v.id("applications"),
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
    if (!application) throw new Error("Application not found");
    if (application.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      extractionState: "pending",
      extractionError: undefined,
      extractionWarnings: undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const completeExtraction = internalMutation({
  args: {
    id: v.id("applications"),
    title: v.string(),
    company: v.string(),
    companyResearch: v.optional(companyResearchValidator),
    categories: v.optional(v.array(v.string())),
    warnings: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.id);
    if (!application) {
      return null;
    }

    const normalizedTitle = normalizeName(args.title, UNKNOWN_TITLE);
    const normalizedCompany = normalizeName(args.company, UNKNOWN_COMPANY);
    const normalizedCategories = normalizeCategories(args.categories);

    await ctx.db.patch(args.id, {
      title: normalizedTitle,
      company: normalizedCompany,
      companyResearch: normalizeCompanyResearch(args.companyResearch),
      categories: normalizedCategories,
      extractionWarnings: normalizeWarnings(args.warnings),
      extractionState: "success",
      extractionError: undefined,
      updatedAt: Date.now(),
    });

    await upsertProfileSuggestion(ctx, {
      userId: application.userId,
      sourceType: "application",
      sourceId: application._id,
      proposedPatch: buildProfilePatchFromApplication({
        title: normalizedTitle,
        company: normalizedCompany,
        categories: normalizedCategories,
        jobDescription: application.jobDescription,
      }),
    });

    return args.id;
  },
});

export const failExtraction = internalMutation({
  args: {
    id: v.id("applications"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.id);
    if (!application) {
      return null;
    }

    await ctx.db.patch(args.id, {
      extractionState: "failed",
      extractionError: normalizeText(args.message),
      extractionWarnings: undefined,
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

    await removeCoverLettersForApplication(ctx, user._id, application._id);

    const tailoredResumes = await listTailoredResumesForApplication(ctx, user._id, application._id);

    for (const tailoredResume of tailoredResumes) {
      await removeResumeAndStats(ctx, tailoredResume._id);
    }

    const queueItems = await ctx.db
      .query("aiActions")
      .withIndex("by_target", (q: any) =>
        q.eq("targetType", "application").eq("targetId", application._id),
      )
      .collect();

    for (const item of queueItems) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(id);
  },
});
