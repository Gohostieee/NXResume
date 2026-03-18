import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { hashResumeData } from "../lib/resume/proposal";
import { buildResumeFromProfileContext } from "../lib/profile/resume-seed";
import { buildProfilePatchFromResume } from "../lib/profile/suggestions";
import {
  cloneResumeSnapshot,
  commitBranchSnapshot,
  createInitialResumeHistory,
  deleteResumeHistory,
  ensureResumeHistory,
  ensureUniqueBranchName,
  extractSnapshotFromResume,
  getBranchHeadCommit,
  getResumeDefaultBranch,
  getResumeSnapshotHash,
  getResumeSnapshotPatch,
  listBranchCommits,
  listResumeBranches,
  mergeChangedPaths,
  resolveActiveBranch,
  syncResumeRootFromBranchHead,
  type ResumeVersionSnapshot,
} from "./resumeHistory";
import { getCareerProfileContextByUserId, upsertProfileSuggestion } from "./profileSupport";

const visibilityValidator = v.union(v.literal("private"), v.literal("public"));
const changeKindValidator = v.union(v.literal("manual"), v.literal("ai"), v.literal("system"));

// Default resume data structure - matches the schema from lib/schema
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isRegularResume = (scope?: "regular" | "application_tailored") =>
  scope === undefined || scope === "regular";

const cloneResumeData = () => JSON.parse(JSON.stringify(defaultResumeData));

const buildResumeDataForUser = (
  user: { name: string; email: string; picture?: string | null },
  importedData?: typeof defaultResumeData,
) => {
  const fallbackData = cloneResumeData();

  fallbackData.basics.name = user.name;
  fallbackData.basics.email = user.email;
  fallbackData.basics.picture.url = user.picture ?? "";

  if (!importedData) {
    return fallbackData;
  }

  const data = importedData;

  return {
    ...data,
    basics: {
      ...data.basics,
      name: data.basics?.name?.trim() ? data.basics.name : user.name,
      email: data.basics?.email?.trim() ? data.basics.email : user.email,
      picture: {
        ...fallbackData.basics.picture,
        ...data.basics?.picture,
        url: data.basics?.picture?.url?.trim() ? data.basics.picture.url : (user.picture ?? ""),
      },
    },
  };
};

const getCurrentUser = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();
};

const requireCurrentUser = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Unauthorized");
  return user;
};

const getOwnedResume = async (ctx: any, userId: Id<"users">, resumeId: Id<"resumes">) => {
  const resume = await ctx.db.get(resumeId);
  if (!resume) throw new Error("Resume not found");
  if (resume.userId !== userId) throw new Error("Unauthorized");
  return resume;
};

const generateUniqueSlug = async (ctx: any, userId: Id<"users">, baseSlug: string) => {
  const root = slugify(baseSlug) || "resume";
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

const resolveBranchSnapshot = async (ctx: any, branch: any, fallback: ResumeVersionSnapshot) => {
  if (branch?.draftSnapshot) {
    return cloneResumeSnapshot(branch.draftSnapshot);
  }

  const headCommit = branch ? await getBranchHeadCommit(ctx, branch) : null;
  if (headCommit?.snapshot) {
    return cloneResumeSnapshot(headCommit.snapshot);
  }

  return cloneResumeSnapshot(fallback);
};

const resolveDefaultSnapshot = async (ctx: any, resume: any) => {
  const fallback = extractSnapshotFromResume(resume);
  const defaultBranch = await getResumeDefaultBranch(ctx, resume);
  if (!defaultBranch) {
    return { snapshot: fallback, branch: null };
  }

  const headCommit = await getBranchHeadCommit(ctx, defaultBranch);
  return {
    snapshot: cloneResumeSnapshot(headCommit?.snapshot ?? defaultBranch.draftSnapshot ?? fallback),
    branch: defaultBranch,
  };
};

const buildResumeRecordForSnapshot = (resume: any, snapshot: ResumeVersionSnapshot) => ({
  ...resume,
  id: resume._id,
  title: snapshot.title,
  visibility: snapshot.visibility,
  data: snapshot.data,
});

const sortBranches = (branches: any[], resume: any) =>
  [...branches].sort((left, right) => {
    const leftDefault = left._id === resume.defaultBranchId || left.isDefault;
    const rightDefault = right._id === resume.defaultBranchId || right.isDefault;
    if (leftDefault !== rightDefault) return leftDefault ? -1 : 1;
    return left.createdAt - right.createdAt;
  });

const sortCommits = (commits: any[]) => [...commits].sort((left, right) => right.createdAt - left.createdAt);

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    data: v.optional(v.any()),
    historySource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const slug = args.slug || slugify(args.title);

    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_user_slug", (q: any) => q.eq("userId", user._id).eq("slug", slug))
      .first();

    if (existing) throw new Error("Resume slug already exists");

    const data = buildResumeDataForUser(user, args.data);
    const visibility = args.visibility || "private";
    const now = Date.now();

    const resumeId = await ctx.db.insert("resumes", {
      title: args.title,
      slug,
      data,
      visibility,
      locked: false,
      scope: "regular",
      applicationId: undefined,
      defaultBranchId: undefined,
      activeBranchId: undefined,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statistics", {
      resumeId,
      views: 0,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
    });

    await createInitialResumeHistory(ctx, {
      resumeId,
      userId: user._id,
      snapshot: { title: args.title, visibility, data },
      changeSource: args.historySource ?? "create",
      createdAt: now,
    });

    if (args.data) {
      await upsertProfileSuggestion(ctx, {
        userId: user._id,
        sourceType: "resume_json_import",
        sourceId: resumeId,
        proposedPatch: buildProfilePatchFromResume(data),
      });
    }

    return resumeId;
  },
});

export const createFromProfile = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const profileContext = await getCareerProfileContextByUserId(ctx, user._id);
    const slug = await generateUniqueSlug(ctx, user._id, args.title);
    const now = Date.now();
    const data = buildResumeFromProfileContext(profileContext);
    const visibility = "private";

    const resumeId = await ctx.db.insert("resumes", {
      title: args.title,
      slug,
      data,
      visibility,
      locked: false,
      scope: "regular",
      applicationId: undefined,
      defaultBranchId: undefined,
      activeBranchId: undefined,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statistics", {
      resumeId,
      views: 0,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
    });

    await createInitialResumeHistory(ctx, {
      resumeId,
      userId: user._id,
      snapshot: { title: args.title, visibility, data },
      changeSource: "create_from_profile",
      createdAt: now,
    });

    return resumeId;
  },
});

export const createPendingPdfImport = mutation({
  args: {
    title: v.string(),
    filename: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const slug = slugify(args.title);

    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_user_slug", (q: any) => q.eq("userId", user._id).eq("slug", slug))
      .first();

    if (existing) throw new Error("Resume slug already exists");

    const now = Date.now();
    const data = buildResumeDataForUser(user);

    const resumeId = await ctx.db.insert("resumes", {
      title: args.title,
      slug,
      data,
      visibility: "private",
      locked: true,
      scope: "regular",
      applicationId: undefined,
      defaultBranchId: undefined,
      activeBranchId: undefined,
      importState: "pending",
      importError: undefined,
      importFilename: args.filename,
      importStorageId: args.storageId,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statistics", {
      resumeId,
      views: 0,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
    });

    return resumeId;
  },
});

export const retryPdfImport = mutation({
  args: {
    id: v.id("resumes"),
  },
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, id);

    if (!resume.importStorageId) {
      throw new Error("Resume import file is no longer available.");
    }

    await ctx.db.patch(id, {
      importState: "pending",
      importError: undefined,
      locked: true,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const ensureHistory = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, id);
    return await ensureResumeHistory(ctx, resume, "create");
  },
});

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const resumes = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return resumes.filter((resume) => isRegularResume(resume.scope));
  },
});

export const listAll = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("resumes")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const resume = await ctx.db.get(id);
    if (!resume || resume.userId !== user._id) {
      return null;
    }

    const { snapshot } = await resolveDefaultSnapshot(ctx, resume);
    return buildResumeRecordForSnapshot(resume, snapshot);
  },
});

export const getBuilderState = query({
  args: {
    id: v.id("resumes"),
    branchId: v.optional(v.id("resumeBranches")),
  },
  handler: async (ctx, { id, branchId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const resume = await ctx.db.get(id);
    if (!resume || resume.userId !== user._id) {
      return null;
    }

    const fallbackSnapshot = extractSnapshotFromResume(resume);
    const branches = await listResumeBranches(ctx, resume._id);

    if (branches.length === 0) {
      return {
        historyReady: false,
        resume: buildResumeRecordForSnapshot(resume, fallbackSnapshot),
        activeBranch: null,
        branches: [],
        commits: [],
        workingSnapshot: fallbackSnapshot,
      };
    }

    const activeBranch = await resolveActiveBranch(ctx, resume, branchId);
    if (!activeBranch || activeBranch.resumeId !== resume._id) {
      return null;
    }

    const workingSnapshot = await resolveBranchSnapshot(ctx, activeBranch, fallbackSnapshot);
    const activeCommits = sortCommits(await listBranchCommits(ctx, activeBranch._id));
    const sortedBranches = sortBranches(branches, resume);

    return {
      historyReady: true,
      resume: {
        ...buildResumeRecordForSnapshot(resume, workingSnapshot),
        defaultBranchId: resume.defaultBranchId,
        activeBranchId: resume.activeBranchId,
      },
      activeBranch,
      branches: sortedBranches,
      commits: activeCommits,
      workingSnapshot,
    };
  },
});

export const getPublicByUsernameSlug = query({
  args: { username: v.string(), slug: v.string() },
  handler: async (ctx, { username, slug }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q: any) => q.eq("username", username))
      .first();

    if (!user) return null;

    const resume = await ctx.db
      .query("resumes")
      .withIndex("by_user_slug", (q: any) => q.eq("userId", user._id).eq("slug", slug))
      .first();

    if (!resume || resume.visibility !== "public" || resume.scope === "application_tailored") {
      return null;
    }

    const { snapshot } = await resolveDefaultSnapshot(ctx, resume);
    const data = { ...snapshot.data };
    if (data.metadata) {
      data.metadata = { ...data.metadata, notes: "" };
    }

    return {
      ...resume,
      title: snapshot.title,
      visibility: snapshot.visibility,
      data,
      user: { name: user.name, username: user.username },
    };
  },
});

export const update = mutation({
  args: {
    id: v.id("resumes"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, id);

    if (resume.locked) throw new Error("Resume is locked");

    await ensureResumeHistory(ctx, resume, "create");

    const defaultBranch = await getResumeDefaultBranch(ctx, resume);
    if (!defaultBranch) throw new Error("Resume history is unavailable");

    if (updates.slug !== undefined) {
      const existing = await ctx.db
        .query("resumes")
        .withIndex("by_user_slug", (q: any) => q.eq("userId", user._id).eq("slug", updates.slug))
        .first();

      if (existing && existing._id !== resume._id) {
        throw new Error("Resume slug already exists");
      }
    }

    const currentSnapshot = await resolveBranchSnapshot(ctx, defaultBranch, extractSnapshotFromResume(resume));
    const nextSnapshot: ResumeVersionSnapshot = {
      title: updates.title ?? currentSnapshot.title,
      visibility: updates.visibility ?? currentSnapshot.visibility,
      data: updates.data ?? currentSnapshot.data,
    };

    const changedPaths: string[] = [];
    if (updates.title !== undefined && updates.title !== currentSnapshot.title) changedPaths.push("title");
    if (
      updates.visibility !== undefined &&
      updates.visibility !== currentSnapshot.visibility
    ) {
      changedPaths.push("visibility");
    }
    if (
      updates.data !== undefined &&
      getResumeSnapshotHash({ ...currentSnapshot, data: currentSnapshot.data }) !==
        getResumeSnapshotHash({ ...currentSnapshot, data: updates.data })
    ) {
      changedPaths.push("data");
    }

    if (changedPaths.length > 0) {
      await commitBranchSnapshot(ctx, {
        resume,
        branch: defaultBranch,
        snapshot: nextSnapshot,
        changeKind: "manual",
        changeSource: "dashboard_update",
        changedPaths,
        authorId: user._id,
      });
    }

    const patchData: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.slug !== undefined) patchData.slug = updates.slug;
    if (Object.keys(patchData).length > 1) {
      await ctx.db.patch(id, patchData);
    }

    if (updates.data !== undefined && isRegularResume(resume.scope)) {
      await upsertProfileSuggestion(ctx, {
        userId: user._id,
        sourceType: "resume_snapshot",
        sourceId: resume._id,
        proposedPatch: buildProfilePatchFromResume(nextSnapshot.data),
      });
    }

    return id;
  },
});

export const saveDraft = mutation({
  args: {
    resumeId: v.id("resumes"),
    branchId: v.optional(v.id("resumeBranches")),
    snapshot: v.object({
      title: v.string(),
      visibility: visibilityValidator,
      data: v.any(),
    }),
    changedPaths: v.array(v.string()),
    changeSource: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, args.resumeId);
    if (resume.locked) throw new Error("Resume is locked");

    await ensureResumeHistory(ctx, resume, "create");
    const branch = await resolveActiveBranch(ctx, resume, args.branchId);
    if (!branch || branch.resumeId !== resume._id) {
      throw new Error("Branch not found");
    }

    const now = Date.now();
    const draftChangedPaths = mergeChangedPaths(branch.draftChangedPaths ?? [], args.changedPaths);
    await ctx.db.patch(branch._id, {
      draftSnapshot: cloneResumeSnapshot(args.snapshot),
      draftChangedPaths,
      draftChangeSource: args.changeSource || branch.draftChangeSource,
      draftSessionStartedAt:
        (branch.draftChangedPaths?.length ?? 0) === 0 ? now : (branch.draftSessionStartedAt ?? now),
      draftUpdatedAt: now,
      updatedAt: now,
    });

    if (resume.activeBranchId !== branch._id) {
      await ctx.db.patch(resume._id, { activeBranchId: branch._id, updatedAt: now });
    }

    return branch._id;
  },
});

export const commitDraft = mutation({
  args: {
    resumeId: v.id("resumes"),
    branchId: v.optional(v.id("resumeBranches")),
    changeKind: v.optional(changeKindValidator),
    changeSource: v.optional(v.string()),
    changedPaths: v.optional(v.array(v.string())),
    message: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, args.resumeId);
    if (resume.locked) throw new Error("Resume is locked");

    await ensureResumeHistory(ctx, resume, "create");
    const branch = await resolveActiveBranch(ctx, resume, args.branchId);
    if (!branch || branch.resumeId !== resume._id) {
      throw new Error("Branch not found");
    }

    const currentSnapshot = await resolveBranchSnapshot(ctx, branch, extractSnapshotFromResume(resume));
    const headCommit = await getBranchHeadCommit(ctx, branch);
    const headSnapshot = headCommit?.snapshot
      ? cloneResumeSnapshot(headCommit.snapshot)
      : extractSnapshotFromResume(resume);
    const changedPaths = args.changedPaths ?? branch.draftChangedPaths ?? [];
    const changeKind = args.changeKind ?? "manual";
    const changeSource = args.changeSource ?? branch.draftChangeSource ?? "builder_manual";

    if (getResumeSnapshotHash(currentSnapshot) === getResumeSnapshotHash(headSnapshot)) {
      await ctx.db.patch(branch._id, {
        draftSnapshot: cloneResumeSnapshot(headSnapshot),
        draftHeadCommitId: branch.headCommitId,
        draftChangedPaths: [],
        draftChangeSource: undefined,
        draftSessionStartedAt: undefined,
        draftUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return branch.headCommitId ?? null;
    }

    const commitId = await commitBranchSnapshot(ctx, {
      resume,
      branch,
      snapshot: currentSnapshot,
      changeKind,
      changeSource,
      changedPaths,
      authorId: user._id,
      message: args.message,
      summary: args.summary,
    });

    if (isRegularResume(resume.scope)) {
      await upsertProfileSuggestion(ctx, {
        userId: user._id,
        sourceType: "resume_snapshot",
        sourceId: resume._id,
        proposedPatch: buildProfilePatchFromResume(currentSnapshot.data),
      });
    }

    return commitId;
  },
});

export const applyAiProposal = mutation({
  args: {
    resumeId: v.id("resumes"),
    branchId: v.id("resumeBranches"),
    baseHash: v.string(),
    proposalSnapshot: v.object({
      title: v.string(),
      visibility: visibilityValidator,
      data: v.any(),
    }),
    message: v.optional(v.string()),
    summary: v.optional(v.string()),
    changeSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, args.resumeId);
    if (resume.locked) throw new Error("Resume is locked");

    await ensureResumeHistory(ctx, resume, "create");
    const branch = await resolveActiveBranch(ctx, resume, args.branchId);
    if (!branch || branch.resumeId !== resume._id) {
      throw new Error("Branch not found");
    }

    const currentSnapshot = await resolveBranchSnapshot(ctx, branch, extractSnapshotFromResume(resume));
    if (hashResumeData(currentSnapshot.data) !== args.baseHash) {
      throw new Error("Resume changed since this AI draft was generated. Rerun the AI action.");
    }

    const headCommit = await getBranchHeadCommit(ctx, branch);
    const headSnapshot = headCommit?.snapshot
      ? cloneResumeSnapshot(headCommit.snapshot)
      : extractSnapshotFromResume(resume);

    if (getResumeSnapshotHash(currentSnapshot) !== getResumeSnapshotHash(headSnapshot)) {
      await commitBranchSnapshot(ctx, {
        resume,
        branch,
        snapshot: currentSnapshot,
        changeKind: "manual",
        changeSource: branch.draftChangeSource ?? "builder_manual",
        changedPaths: branch.draftChangedPaths ?? [],
        authorId: user._id,
      });
    }

    const freshBranch = await ctx.db.get(branch._id);
    if (!freshBranch) throw new Error("Branch not found");

    return await commitBranchSnapshot(ctx, {
      resume,
      branch: freshBranch,
      snapshot: args.proposalSnapshot,
      changeKind: "ai",
      changeSource: args.changeSource ?? "ai_editor",
      changedPaths: ["data"],
      authorId: user._id,
      message: args.message,
      summary: args.summary,
    });
  },
});

export const createBranchFromCommit = mutation({
  args: {
    resumeId: v.id("resumes"),
    commitId: v.id("resumeCommits"),
    sourceBranchId: v.optional(v.id("resumeBranches")),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, args.resumeId);
    await ensureResumeHistory(ctx, resume, "create");

    const commit = await ctx.db.get(args.commitId);
    if (!commit || commit.resumeId !== resume._id) {
      throw new Error("Commit not found");
    }

    const branchName = await ensureUniqueBranchName(ctx, resume._id, args.name ?? "branch");
    const now = Date.now();

    const branchId = await ctx.db.insert("resumeBranches", {
      resumeId: resume._id,
      name: branchName,
      headCommitId: commit._id,
      baseCommitId: commit._id,
      createdFromBranchId: args.sourceBranchId,
      isDefault: false,
      draftSnapshot: cloneResumeSnapshot(commit.snapshot),
      draftHeadCommitId: commit._id,
      draftChangedPaths: [],
      draftChangeSource: undefined,
      draftSessionStartedAt: undefined,
      draftUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(resume._id, {
      activeBranchId: branchId,
      updatedAt: now,
    });

    return branchId;
  },
});

export const switchBranch = mutation({
  args: {
    resumeId: v.id("resumes"),
    branchId: v.id("resumeBranches"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, args.resumeId);
    const branch = await ctx.db.get(args.branchId);

    if (!branch || branch.resumeId !== resume._id) {
      throw new Error("Branch not found");
    }

    await ctx.db.patch(resume._id, {
      activeBranchId: branch._id,
      updatedAt: Date.now(),
    });

    return branch._id;
  },
});

export const renameBranch = mutation({
  args: {
    resumeId: v.id("resumes"),
    branchId: v.id("resumeBranches"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, args.resumeId);
    const branch = await ctx.db.get(args.branchId);

    if (!branch || branch.resumeId !== resume._id) {
      throw new Error("Branch not found");
    }

    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Branch name is required");

    const existing = await ctx.db
      .query("resumeBranches")
      .withIndex("by_resume_name", (q: any) => q.eq("resumeId", resume._id).eq("name", trimmed))
      .first();

    if (existing && existing._id !== branch._id) {
      throw new Error("Branch name already exists");
    }

    await ctx.db.patch(branch._id, {
      name: trimmed,
      updatedAt: Date.now(),
    });

    return branch._id;
  },
});

export const setDefaultBranch = mutation({
  args: {
    resumeId: v.id("resumes"),
    branchId: v.id("resumeBranches"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, args.resumeId);
    const branch = await ctx.db.get(args.branchId);

    if (!branch || branch.resumeId !== resume._id) {
      throw new Error("Branch not found");
    }

    const branches = await listResumeBranches(ctx, resume._id);
    const now = Date.now();

    for (const candidate of branches) {
      if (candidate.isDefault !== (candidate._id === branch._id)) {
        await ctx.db.patch(candidate._id, {
          isDefault: candidate._id === branch._id,
          updatedAt: now,
        });
      }
    }

    const headCommit = await getBranchHeadCommit(ctx, branch);
    const snapshot = cloneResumeSnapshot(
      headCommit?.snapshot ?? branch.draftSnapshot ?? extractSnapshotFromResume(resume),
    );

    await syncResumeRootFromBranchHead(ctx, resume._id, snapshot, {
      defaultBranchId: branch._id,
      updatedAt: now,
    });

    return branch._id;
  },
});

export const remove = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, id);

    const linkedCoverLetters = await ctx.db
      .query("coverLetters")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    if (linkedCoverLetters.some((coverLetter) => coverLetter.resumeId === id)) {
      throw new Error(
        "Resume is linked to at least one cover letter. Update or delete those cover letters first.",
      );
    }

    const stats = await ctx.db
      .query("statistics")
      .withIndex("by_resume", (q: any) => q.eq("resumeId", id))
      .first();

    if (stats) await ctx.db.delete(stats._id);

    if (resume.importStorageId) {
      await ctx.storage.delete(resume.importStorageId);
    }

    const queueItems = await ctx.db
      .query("aiActions")
      .withIndex("by_target", (q: any) => q.eq("targetType", "resume").eq("targetId", id))
      .collect();

    for (const item of queueItems) {
      await ctx.db.delete(item._id);
    }

    if (resume.scope === "application_tailored" && typeof resume.applicationId === "string") {
      const applicationId = ctx.db.normalizeId("applications", resume.applicationId);
      if (applicationId) {
        const application = await ctx.db.get(applicationId);
        if (application?.tailoredResumeId === id) {
          const remainingTailoredResumes = await ctx.db
            .query("resumes")
            .withIndex("by_user_application", (q: any) =>
              q.eq("userId", user._id).eq("applicationId", applicationId),
            )
            .collect();

          const nextTailoredResume = remainingTailoredResumes
            .filter(
              (candidate: any) => candidate.scope === "application_tailored" && candidate._id !== id,
            )
            .sort((a: any, b: any) => b.updatedAt - a.updatedAt)[0];

          await ctx.db.patch(applicationId, {
            tailoredResumeId: nextTailoredResume?._id,
            updatedAt: Date.now(),
          });
        }
      }
    }

    await deleteResumeHistory(ctx, id);
    await ctx.db.delete(id);
  },
});

export const lock = mutation({
  args: { id: v.id("resumes"), locked: v.boolean() },
  handler: async (ctx, { id, locked }) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, id);

    await ctx.db.patch(resume._id, { locked, updatedAt: Date.now() });
  },
});

export const getByIdInternal = query({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const resume = await ctx.db.get(id);
    if (!resume) return null;

    const { snapshot, branch } = await resolveDefaultSnapshot(ctx, resume);
    return {
      ...resume,
      defaultBranch: branch,
      resolvedSnapshot: snapshot,
    };
  },
});

export const duplicate = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const resume = await getOwnedResume(ctx, user._id, id);

    const { snapshot } = await resolveDefaultSnapshot(ctx, resume);
    const nextTitle = `${snapshot.title} (Copy)`;
    const newSlug = await generateUniqueSlug(ctx, user._id, `${resume.slug}-copy`);
    const now = Date.now();

    const nextSnapshot: ResumeVersionSnapshot = {
      title: nextTitle,
      visibility: "private",
      data: snapshot.data,
    };

    const newResumeId = await ctx.db.insert("resumes", {
      ...getResumeSnapshotPatch(nextSnapshot),
      slug: newSlug,
      locked: false,
      scope: "regular",
      applicationId: undefined,
      defaultBranchId: undefined,
      activeBranchId: undefined,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("statistics", {
      resumeId: newResumeId,
      views: 0,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
    });

    await createInitialResumeHistory(ctx, {
      resumeId: newResumeId,
      userId: user._id,
      snapshot: nextSnapshot,
      changeSource: "duplicate",
      createdAt: now,
    });

    return newResumeId;
  },
});

export const completePdfImport = internalMutation({
  args: {
    id: v.id("resumes"),
    data: v.any(),
  },
  handler: async (ctx, { id, data }) => {
    const resume = await ctx.db.get(id);
    if (!resume) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(id, {
      data,
      locked: false,
      importState: undefined,
      importError: undefined,
      importFilename: undefined,
      importStorageId: undefined,
      updatedAt: now,
    });

    if (!resume.defaultBranchId) {
      await createInitialResumeHistory(ctx, {
        resumeId: id,
        userId: resume.userId,
        snapshot: {
          title: resume.title,
          visibility: resume.visibility,
          data,
        },
        changeSource: "import_pdf",
        createdAt: now,
      });
    }

    await upsertProfileSuggestion(ctx, {
      userId: resume.userId,
      sourceType: "resume_pdf_import",
      sourceId: id,
      proposedPatch: buildProfilePatchFromResume(data),
    });

    return { id };
  },
});

export const failPdfImport = internalMutation({
  args: {
    id: v.id("resumes"),
    message: v.string(),
  },
  handler: async (ctx, { id, message }) => {
    const resume = await ctx.db.get(id);
    if (!resume) {
      return null;
    }

    await ctx.db.patch(id, {
      importState: "failed",
      importError: message.trim(),
      locked: true,
      updatedAt: Date.now(),
    });

    return { id };
  },
});
