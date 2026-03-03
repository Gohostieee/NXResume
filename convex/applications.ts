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
    awards: { id: "awards", name: "Awards", columns: 1, separateLinks: true, visible: true, items: [] },
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
    skills: { id: "skills", name: "Skills", columns: 1, separateLinks: true, visible: true, items: [] },
    custom: {},
  },
  metadata: {
    template: "rhyhorn",
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
      font: { family: "IBM Plex Sans", subset: "latin", variants: ["regular", "italic", "600"], size: 14 },
      lineHeight: 1.5,
      hideIcons: false,
      underlineLinks: true,
    },
    notes: "",
  },
};

const cloneResumeData = <T>(data: T): T => JSON.parse(JSON.stringify(data));

const buildDefaultResumeDataForUser = (user: {
  name: string;
  email: string;
  picture?: string;
}) => {
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

  await ctx.db.delete(resumeId);
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
    }

    if (application.tailoredResumeId) {
      const existingTailored = await ctx.db.get(application.tailoredResumeId);
      if (existingTailored && existingTailored.userId === user._id) {
        await removeResumeAndStats(ctx, application.tailoredResumeId);
      }
    }

    const now = Date.now();
    const title =
      args.mode === "base"
        ? `${baseResume.title} (${application.company} - Tailored)`
        : `${application.title} @ ${application.company} (Tailored)`;
    const slug = await generateUniqueSlug(ctx, user._id, title);
    const data =
      args.mode === "base"
        ? cloneResumeData(baseResume.data)
        : buildDefaultResumeDataForUser({
            name: user.name,
            email: user.email,
            picture: user.picture,
          });

    const tailoredResumeId = await ctx.db.insert("resumes", {
      title,
      slug,
      data,
      visibility: "private",
      locked: false,
      scope: "application_tailored",
      applicationId: application._id,
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

    return tailoredResumeId;
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

    if (application.tailoredResumeId) {
      const tailoredResume = await ctx.db.get(application.tailoredResumeId);
      if (tailoredResume && tailoredResume.userId === user._id) {
        await removeResumeAndStats(ctx, application.tailoredResumeId);
      }
    }

    await ctx.db.delete(id);
  },
});
