import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { resolveDefaultResumeSnapshot } from "./resumeHistory";

const presetValidator = v.union(
  v.literal("balanced"),
  v.literal("mission_culture"),
  v.literal("growth_ipo"),
);

const focusModuleValidator = v.union(
  v.literal("recent_achievements"),
  v.literal("company_mission"),
  v.literal("ipo_growth_signals"),
  v.literal("future_prospects"),
  v.literal("work_culture"),
);

const visibilityValidator = v.union(v.literal("private"), v.literal("public"));
const generationStateValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("failed"),
);

const focusModuleValues = [
  "recent_achievements",
  "company_mission",
  "ipo_growth_signals",
  "future_prospects",
  "work_culture",
] as const;

const normalizeText = (value: string | undefined) => value?.trim() ?? "";

const normalizeFocusModules = (values: string[]) => {
  const allowed = new Set(focusModuleValues);
  const deduped = Array.from(new Set(values.map((value) => normalizeText(value))));
  const normalized = deduped.filter((value): value is (typeof focusModuleValues)[number] =>
    allowed.has(value as (typeof focusModuleValues)[number]),
  );

  if (normalized.length === 0) {
    throw new Error("At least one focus module is required");
  }

  return normalized;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getCurrentUser = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();
};

const generateUniqueSlug = async (ctx: any, userId: any, base: string) => {
  const root = slugify(base) || "cover-letter";
  let candidate = root;
  let counter = 1;

  while (true) {
    const existing = await ctx.db
      .query("coverLetters")
      .withIndex("by_user_slug", (q: any) => q.eq("userId", userId).eq("slug", candidate))
      .first();

    if (!existing) return candidate;

    candidate = `${root}-${counter}`;
    counter += 1;
  }
};

const getActiveVersion = async (ctx: any, coverLetterId: any, activeVersion: number) => {
  return await ctx.db
    .query("coverLetterVersions")
    .withIndex("by_cover_letter_version", (q: any) =>
      q.eq("coverLetterId", coverLetterId).eq("version", activeVersion),
    )
    .first();
};

const isNormalizedCoverLetterVersion = (
  version: any,
): version is {
  _id: any;
  version: number;
  contentHtml: string;
  contentText: string;
} =>
  Boolean(version) &&
  typeof version.version === "number" &&
  typeof version.contentHtml === "string" &&
  typeof version.contentText === "string";

export const listByApplicationIds = query({
  args: {
    applicationIds: v.array(v.id("applications")),
  },
  handler: async (ctx, { applicationIds }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    if (applicationIds.length === 0) return [];

    const applicationSet = new Set(applicationIds);

    const coverLetters = await ctx.db
      .query("coverLetters")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return coverLetters.filter((coverLetter) => applicationSet.has(coverLetter.applicationId));
  },
});

export const getById = query({
  args: { id: v.id("coverLetters") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const coverLetter = await ctx.db.get(id);
    if (!coverLetter) return null;
    if (coverLetter.userId !== user._id) return null;

    const versions = await ctx.db
      .query("coverLetterVersions")
      .withIndex("by_cover_letter", (q) => q.eq("coverLetterId", coverLetter._id))
      .collect();

    const sortedVersions = versions
      .filter(isNormalizedCoverLetterVersion)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    const activeVersionData = sortedVersions.find(
      (version) => version.version === coverLetter.activeVersion,
    );

    const application = await ctx.db.get(coverLetter.applicationId);
    const resume = await ctx.db.get(coverLetter.resumeId);
    const resolvedResumeSnapshot =
      resume && resume.userId === user._id
        ? (await resolveDefaultResumeSnapshot(ctx, resume)).snapshot
        : null;

    return {
      ...coverLetter,
      versions: sortedVersions,
      activeVersionData,
      application:
        application && application.userId === user._id
          ? {
              _id: application._id,
              title: application.title,
              company: application.company,
              jobDescription: application.jobDescription,
              categories: application.categories,
              companyResearch: application.companyResearch,
            }
          : null,
      resume:
        resume && resume.userId === user._id
          ? {
              _id: resume._id,
              title: resolvedResumeSnapshot?.title ?? resume.title,
              data: resolvedResumeSnapshot?.data ?? resume.data,
            }
          : null,
    };
  },
});

export const getPublicByUsernameSlug = query({
  args: { username: v.string(), slug: v.string() },
  handler: async (ctx, { username, slug }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (!user) return null;

    const coverLetter = await ctx.db
      .query("coverLetters")
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id).eq("slug", slug))
      .first();

    if (!coverLetter || coverLetter.visibility !== "public") return null;

    const activeVersionData = await getActiveVersion(
      ctx,
      coverLetter._id,
      coverLetter.activeVersion,
    );

    if (!isNormalizedCoverLetterVersion(activeVersionData)) return null;

    const application = await ctx.db.get(coverLetter.applicationId);

    return {
      ...coverLetter,
      activeVersionData,
      application: application
        ? {
            title: application.title,
            company: application.company,
          }
        : null,
      user: {
        name: user.name,
        username: user.username,
      },
    };
  },
});

export const create = mutation({
  args: {
    applicationId: v.id("applications"),
    resumeId: v.id("resumes"),
    title: v.optional(v.string()),
    preset: presetValidator,
    focusModules: v.array(focusModuleValidator),
    customInstruction: v.optional(v.string()),
    contentHtml: v.string(),
    contentText: v.string(),
    generationContext: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");
    if (application.userId !== user._id) throw new Error("Unauthorized");

    const resume = await ctx.db.get(args.resumeId);
    if (!resume) throw new Error("Resume not found");
    if (resume.userId !== user._id) throw new Error("Unauthorized");

    const now = Date.now();
    const focusModules = normalizeFocusModules(args.focusModules);

    const title =
      normalizeText(args.title) ||
      `${application.title} @ ${application.company} Cover Letter`;

    const slug = await generateUniqueSlug(ctx, user._id, title);

    const coverLetterId = await ctx.db.insert("coverLetters", {
      userId: user._id,
      applicationId: application._id,
      resumeId: resume._id,
      title,
      slug,
      visibility: "private",
      preset: args.preset,
      focusModules,
      customInstruction: normalizeText(args.customInstruction) || undefined,
      activeVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("coverLetterVersions", {
      coverLetterId,
      version: 1,
      contentHtml: args.contentHtml,
      contentText: args.contentText,
      generationContext: args.generationContext,
      createdAt: now,
      updatedAt: now,
    });

    return coverLetterId;
  },
});

export const createPending = mutation({
  args: {
    applicationId: v.id("applications"),
    resumeId: v.id("resumes"),
    preset: presetValidator,
    focusModules: v.array(focusModuleValidator),
    customInstruction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");
    if (application.userId !== user._id) throw new Error("Unauthorized");

    const resume = await ctx.db.get(args.resumeId);
    if (!resume) throw new Error("Resume not found");
    if (resume.userId !== user._id) throw new Error("Unauthorized");

    const now = Date.now();
    const focusModules = normalizeFocusModules(args.focusModules);
    const title = `${application.title} @ ${application.company} Cover Letter`;
    const slug = await generateUniqueSlug(ctx, user._id, title);

    return await ctx.db.insert("coverLetters", {
      userId: user._id,
      applicationId: application._id,
      resumeId: resume._id,
      title,
      slug,
      visibility: "private",
      preset: args.preset,
      focusModules,
      customInstruction: normalizeText(args.customInstruction) || undefined,
      activeVersion: 0,
      generationState: undefined,
      generationError: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveEdit = mutation({
  args: {
    id: v.id("coverLetters"),
    title: v.optional(v.string()),
    contentHtml: v.string(),
    contentText: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const coverLetter = await ctx.db.get(args.id);
    if (!coverLetter) throw new Error("Cover letter not found");
    if (coverLetter.userId !== user._id) throw new Error("Unauthorized");
    if (coverLetter.generationState === "queued" || coverLetter.generationState === "running") {
      throw new Error("Cover letter is currently generating.");
    }

    const activeVersion = await getActiveVersion(
      ctx,
      coverLetter._id,
      coverLetter.activeVersion,
    );

    if (!isNormalizedCoverLetterVersion(activeVersion)) {
      throw new Error("Active version not found");
    }

    const now = Date.now();

    await ctx.db.patch(activeVersion._id, {
      contentHtml: args.contentHtml,
      contentText: args.contentText,
      updatedAt: now,
    });

    const normalizedTitle = normalizeText(args.title);

    await ctx.db.patch(coverLetter._id, {
      title: normalizedTitle || coverLetter.title,
      updatedAt: now,
    });

    return coverLetter._id;
  },
});

export const regenerate = mutation({
  args: {
    id: v.id("coverLetters"),
    resumeId: v.optional(v.id("resumes")),
    title: v.optional(v.string()),
    preset: v.optional(presetValidator),
    focusModules: v.optional(v.array(focusModuleValidator)),
    customInstruction: v.optional(v.string()),
    contentHtml: v.string(),
    contentText: v.string(),
    generationContext: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const coverLetter = await ctx.db.get(args.id);
    if (!coverLetter) throw new Error("Cover letter not found");
    if (coverLetter.userId !== user._id) throw new Error("Unauthorized");

    if (args.resumeId) {
      const resume = await ctx.db.get(args.resumeId);
      if (!resume) throw new Error("Resume not found");
      if (resume.userId !== user._id) throw new Error("Unauthorized");
    }

    const now = Date.now();
    const nextVersion = coverLetter.activeVersion + 1;

    await ctx.db.insert("coverLetterVersions", {
      coverLetterId: coverLetter._id,
      version: nextVersion,
      contentHtml: args.contentHtml,
      contentText: args.contentText,
      generationContext: args.generationContext,
      createdAt: now,
      updatedAt: now,
    });

    const patchData: Record<string, unknown> = {
      activeVersion: nextVersion,
      updatedAt: now,
    };

    const normalizedTitle = normalizeText(args.title);

    if (args.resumeId) patchData.resumeId = args.resumeId;
    if (args.preset) patchData.preset = args.preset;
    if (args.focusModules) patchData.focusModules = normalizeFocusModules(args.focusModules);
    if (args.customInstruction !== undefined) {
      patchData.customInstruction = normalizeText(args.customInstruction) || undefined;
    }
    if (normalizedTitle) patchData.title = normalizedTitle;

    await ctx.db.patch(coverLetter._id, patchData);

    return { id: coverLetter._id, activeVersion: nextVersion };
  },
});

export const setVisibility = mutation({
  args: {
    id: v.id("coverLetters"),
    visibility: visibilityValidator,
  },
  handler: async (ctx, { id, visibility }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const coverLetter = await ctx.db.get(id);
    if (!coverLetter) throw new Error("Cover letter not found");
    if (coverLetter.userId !== user._id) throw new Error("Unauthorized");
    if (coverLetter.generationState === "queued" || coverLetter.generationState === "running") {
      throw new Error("Cover letter is currently generating.");
    }

    await ctx.db.patch(coverLetter._id, {
      visibility,
      updatedAt: Date.now(),
    });

    return coverLetter._id;
  },
});

export const clearGenerationFailure = mutation({
  args: {
    id: v.id("coverLetters"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const coverLetter = await ctx.db.get(id);
    if (!coverLetter) throw new Error("Cover letter not found");
    if (coverLetter.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(id, {
      generationState: undefined,
      generationError: undefined,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("coverLetters"),
  },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const coverLetter = await ctx.db.get(id);
    if (!coverLetter) return null;
    if (coverLetter.userId !== user._id) throw new Error("Unauthorized");

    const versions = await ctx.db
      .query("coverLetterVersions")
      .withIndex("by_cover_letter", (q: any) => q.eq("coverLetterId", coverLetter._id))
      .collect();

    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    const queueItems = await ctx.db
      .query("aiActions")
      .withIndex("by_target", (q: any) =>
        q.eq("targetType", "cover_letter").eq("targetId", coverLetter._id),
      )
      .collect();

    for (const item of queueItems) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(coverLetter._id);
    return coverLetter._id;
  },
});

export const setGenerationState = internalMutation({
  args: {
    id: v.id("coverLetters"),
    state: generationStateValidator,
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coverLetter = await ctx.db.get(args.id);
    if (!coverLetter) {
      return null;
    }

    await ctx.db.patch(args.id, {
      generationState: args.state,
      generationError: normalizeText(args.error) || undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const completeGeneration = internalMutation({
  args: {
    id: v.id("coverLetters"),
    mode: v.union(v.literal("create"), v.literal("regenerate")),
    title: v.string(),
    contentHtml: v.string(),
    contentText: v.string(),
    generationContext: v.any(),
    sourceVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coverLetter = await ctx.db.get(args.id);
    if (!coverLetter) {
      return null;
    }

    if (args.mode === "regenerate" && coverLetter.activeVersion !== args.sourceVersion) {
      throw new Error("Cover letter changed while regeneration was running. Rerun from the latest version.");
    }

    const now = Date.now();
    const nextVersion = Math.max(coverLetter.activeVersion, 0) + 1;

    await ctx.db.insert("coverLetterVersions", {
      coverLetterId: coverLetter._id,
      version: nextVersion,
      contentHtml: args.contentHtml,
      contentText: args.contentText,
      generationContext: args.generationContext,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(coverLetter._id, {
      title: normalizeText(args.title) || coverLetter.title,
      activeVersion: nextVersion,
      generationState: undefined,
      generationError: undefined,
      updatedAt: now,
    });

    return { id: coverLetter._id, activeVersion: nextVersion };
  },
});
