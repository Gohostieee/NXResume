import type { Id } from "./_generated/dataModel";

export type ResumeVisibility = "public" | "private";

export type ResumeVersionSnapshot = {
  title: string;
  visibility: ResumeVisibility;
  data: any;
};

export const DEFAULT_RESUME_BRANCH_NAME = "main";

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const cloneResumeSnapshot = (snapshot: ResumeVersionSnapshot): ResumeVersionSnapshot =>
  cloneValue(snapshot);

export const getResumeSnapshotHash = (snapshot: ResumeVersionSnapshot | null | undefined) =>
  JSON.stringify(snapshot ?? null);

export const extractSnapshotFromResume = (resume: {
  title?: string;
  visibility?: ResumeVisibility;
  data?: any;
}): ResumeVersionSnapshot => ({
  title: resume.title?.trim() || "Untitled Resume",
  visibility: resume.visibility === "public" ? "public" : "private",
  data: cloneValue(resume.data ?? {}),
});

export const getResumeSnapshotPatch = (snapshot: ResumeVersionSnapshot) => ({
  title: snapshot.title,
  visibility: snapshot.visibility,
  data: cloneValue(snapshot.data),
});

const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export const mergeChangedPaths = (current: string[], incoming: string[]) =>
  uniq([...current, ...incoming]);

const humanizeSection = (sectionKey: string) => {
  if (sectionKey === "summary") return "Summary";
  if (sectionKey === "basics") return "Basics";
  if (sectionKey.startsWith("custom.")) return "Custom Section";
  return sectionKey
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const buildResumeCommitMessage = ({
  changeKind,
  changeSource,
  changedPaths,
}: {
  changeKind: "manual" | "ai" | "system";
  changeSource: string;
  changedPaths: string[];
}) => {
  if (changeKind === "ai") {
    if (changeSource.includes("queue")) return "Applied AI queue changes";
    return "Applied AI changes";
  }

  if (changeKind === "system") {
    if (changeSource === "create") return "Created resume";
    if (changeSource === "import_json") return "Imported JSON resume";
    if (changeSource === "import_pdf") return "Imported PDF resume";
    if (changeSource === "duplicate") return "Duplicated resume";
    if (changeSource === "tailored_seed") return "Created tailored resume";
    return "System update";
  }

  const paths = uniq(changedPaths);

  if (paths.some((path) => path === "visibility")) return "Changed Visibility";
  if (paths.some((path) => path === "title")) return "Renamed Resume";
  if (paths.some((path) => path.startsWith("metadata.theme"))) return "Updated Theme";
  if (paths.some((path) => path.startsWith("metadata.layout"))) return "Updated Layout";
  if (paths.some((path) => path.startsWith("metadata.typography"))) return "Updated Typography";
  if (paths.some((path) => path.startsWith("metadata.page"))) return "Updated Page Settings";
  if (paths.some((path) => path.startsWith("metadata.css"))) return "Updated Custom CSS";
  if (paths.some((path) => path.startsWith("metadata.notes"))) return "Updated Notes";
  if (changeSource.includes("reorder") || changeSource.includes("layout_drag")) {
    const sectionPath = paths.find((path) => path.startsWith("sections."));
    if (sectionPath) {
      return `Reordered ${humanizeSection(sectionPath.split(".")[1] ?? "section")}`;
    }
    return "Reordered Resume Content";
  }
  if (paths.some((path) => path === "sections.summary.content")) return "Edited Summary";
  if (paths.some((path) => path.startsWith("basics."))) return "Edited Basics";

  const sectionPath = paths.find((path) => path.startsWith("sections."));
  if (sectionPath) {
    return `Edited ${humanizeSection(sectionPath.split(".")[1] ?? "section")}`;
  }

  return "Manual edits";
};

export const buildResumeCommitSummary = ({
  changeKind,
  changeSource,
  changedPaths,
}: {
  changeKind: "manual" | "ai" | "system";
  changeSource: string;
  changedPaths: string[];
}) => {
  const message = buildResumeCommitMessage({ changeKind, changeSource, changedPaths });
  const compactPaths = uniq(changedPaths).slice(0, 4);
  if (compactPaths.length === 0) return message;
  return `${message}: ${compactPaths.join(", ")}`;
};

export const listResumeBranches = async (ctx: any, resumeId: Id<"resumes">) =>
  await ctx.db
    .query("resumeBranches")
    .withIndex("by_resume", (q: any) => q.eq("resumeId", resumeId))
    .collect();

export const listBranchCommits = async (ctx: any, branchId: Id<"resumeBranches">) =>
  await ctx.db
    .query("resumeCommits")
    .withIndex("by_branch", (q: any) => q.eq("branchId", branchId))
    .collect();

export const getBranchHeadCommit = async (
  ctx: any,
  branch: { headCommitId?: Id<"resumeCommits"> | null },
) => {
  if (!branch.headCommitId) return null;
  return await ctx.db.get(branch.headCommitId);
};

export const getResumeDefaultBranch = async (
  ctx: any,
  resume: { _id: Id<"resumes">; defaultBranchId?: Id<"resumeBranches"> | null },
) => {
  if (resume.defaultBranchId) {
    const branch = await ctx.db.get(resume.defaultBranchId);
    if (branch) return branch;
  }

  const branches = await listResumeBranches(ctx, resume._id);
  return branches.find((branch: any) => branch.isDefault) ?? branches[0] ?? null;
};

export const resolveDefaultResumeSnapshot = async (
  ctx: any,
  resume: { _id: Id<"resumes">; title?: string; visibility?: ResumeVisibility; data?: any; defaultBranchId?: Id<"resumeBranches"> | null },
) => {
  const fallback = extractSnapshotFromResume(resume);
  const branch = await getResumeDefaultBranch(ctx, resume);
  if (!branch) {
    return { branch: null, snapshot: fallback };
  }

  const headCommit = await getBranchHeadCommit(ctx, branch);
  return {
    branch,
    snapshot: cloneResumeSnapshot(headCommit?.snapshot ?? branch.draftSnapshot ?? fallback),
  };
};

export const resolveActiveBranch = async (
  ctx: any,
  resume: {
    _id: Id<"resumes">;
    activeBranchId?: Id<"resumeBranches"> | null;
    defaultBranchId?: Id<"resumeBranches"> | null;
  },
  branchId?: Id<"resumeBranches">,
) => {
  if (branchId) {
    const selected = await ctx.db.get(branchId);
    if (selected) return selected;
  }

  if (resume.activeBranchId) {
    const activeBranch = await ctx.db.get(resume.activeBranchId);
    if (activeBranch) return activeBranch;
  }

  return await getResumeDefaultBranch(ctx, resume);
};

export const ensureUniqueBranchName = async (
  ctx: any,
  resumeId: Id<"resumes">,
  requestedName?: string,
) => {
  const baseName = requestedName?.trim() || "branch";
  const branches = await listResumeBranches(ctx, resumeId);
  const existing = new Set(branches.map((branch: any) => branch.name.toLowerCase()));

  if (!existing.has(baseName.toLowerCase())) {
    return baseName;
  }

  let counter = 2;
  while (existing.has(`${baseName}-${counter}`.toLowerCase())) {
    counter += 1;
  }
  return `${baseName}-${counter}`;
};

export const syncResumeRootFromBranchHead = async (
  ctx: any,
  resumeId: Id<"resumes">,
  snapshot: ResumeVersionSnapshot,
  patch: Record<string, unknown> = {},
) => {
  await ctx.db.patch(resumeId, {
    ...getResumeSnapshotPatch(snapshot),
    ...patch,
  });
};

export const createInitialResumeHistory = async (
  ctx: any,
  {
    resumeId,
    userId,
    snapshot,
    branchName = DEFAULT_RESUME_BRANCH_NAME,
    changeSource,
    createdAt,
  }: {
    resumeId: Id<"resumes">;
    userId: Id<"users">;
    snapshot: ResumeVersionSnapshot;
    branchName?: string;
    changeSource: string;
    createdAt: number;
  },
) => {
  const branchId = await ctx.db.insert("resumeBranches", {
    resumeId,
    name: branchName,
    isDefault: true,
    draftSnapshot: cloneResumeSnapshot(snapshot),
    draftHeadCommitId: undefined,
    draftChangedPaths: [],
    draftChangeSource: undefined,
    draftSessionStartedAt: undefined,
    draftUpdatedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  });

  const message = buildResumeCommitMessage({
    changeKind: "system",
    changeSource,
    changedPaths: ["title", "visibility", "data"],
  });
  const summary = buildResumeCommitSummary({
    changeKind: "system",
    changeSource,
    changedPaths: ["title", "visibility", "data"],
  });

  const commitId = await ctx.db.insert("resumeCommits", {
    resumeId,
    branchId,
    parentCommitId: undefined,
    snapshot: cloneResumeSnapshot(snapshot),
    changeKind: "system",
    changeSource,
    message,
    summary,
    authorId: userId,
    createdAt,
    updatedAt: createdAt,
  });

  await ctx.db.patch(branchId, {
    headCommitId: commitId,
    baseCommitId: commitId,
    draftHeadCommitId: commitId,
    updatedAt: createdAt,
  });

  await ctx.db.patch(resumeId, {
    defaultBranchId: branchId,
    activeBranchId: branchId,
    updatedAt: createdAt,
  });

  return { branchId, commitId };
};

export const ensureResumeHistory = async (
  ctx: any,
  resume: {
    _id: Id<"resumes">;
    userId: Id<"users">;
    title: string;
    visibility: ResumeVisibility;
    data: any;
    defaultBranchId?: Id<"resumeBranches"> | null;
    activeBranchId?: Id<"resumeBranches"> | null;
    createdAt: number;
    updatedAt: number;
  },
  changeSource = "create",
) => {
  const branches = await listResumeBranches(ctx, resume._id);
  if (branches.length === 0) {
    const snapshot = extractSnapshotFromResume(resume);
    return await createInitialResumeHistory(ctx, {
      resumeId: resume._id,
      userId: resume.userId,
      snapshot,
      changeSource,
      createdAt: resume.createdAt ?? Date.now(),
    });
  }

  const defaultBranch =
    branches.find((branch: any) => branch._id === resume.defaultBranchId) ??
    branches.find((branch: any) => branch.isDefault) ??
    branches[0];
  const activeBranch =
    branches.find((branch: any) => branch._id === resume.activeBranchId) ?? defaultBranch;

  const patch: Record<string, unknown> = {};
  if (!resume.defaultBranchId && defaultBranch?._id) patch.defaultBranchId = defaultBranch._id;
  if (!resume.activeBranchId && activeBranch?._id) patch.activeBranchId = activeBranch._id;
  if (Object.keys(patch).length > 0) {
    patch.updatedAt = Date.now();
    await ctx.db.patch(resume._id, patch);
  }

  return {
    branchId: activeBranch?._id,
    commitId: activeBranch?.headCommitId,
  };
};

export const commitBranchSnapshot = async (
  ctx: any,
  {
    resume,
    branch,
    snapshot,
    changeKind,
    changeSource,
    changedPaths,
    authorId,
    message,
    summary,
  }: {
    resume: any;
    branch: any;
    snapshot: ResumeVersionSnapshot;
    changeKind: "manual" | "ai" | "system";
    changeSource: string;
    changedPaths: string[];
    authorId?: Id<"users">;
    message?: string;
    summary?: string;
  },
) => {
  const now = Date.now();
  const resolvedMessage =
    message ?? buildResumeCommitMessage({ changeKind, changeSource, changedPaths });
  const resolvedSummary =
    summary ?? buildResumeCommitSummary({ changeKind, changeSource, changedPaths });

  const commitId = await ctx.db.insert("resumeCommits", {
    resumeId: resume._id,
    branchId: branch._id,
    parentCommitId: branch.headCommitId,
    snapshot: cloneResumeSnapshot(snapshot),
    changeKind,
    changeSource,
    message: resolvedMessage,
    summary: resolvedSummary,
    authorId,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(branch._id, {
    headCommitId: commitId,
    draftSnapshot: cloneResumeSnapshot(snapshot),
    draftHeadCommitId: commitId,
    draftChangedPaths: [],
    draftChangeSource: undefined,
    draftSessionStartedAt: undefined,
    draftUpdatedAt: now,
    updatedAt: now,
  });

  if (branch.isDefault || resume.defaultBranchId === branch._id) {
    await syncResumeRootFromBranchHead(ctx, resume._id, snapshot, { updatedAt: now });
  } else {
    await ctx.db.patch(resume._id, { updatedAt: now });
  }

  return commitId;
};

export const deleteResumeHistory = async (ctx: any, resumeId: Id<"resumes">) => {
  const branches = await listResumeBranches(ctx, resumeId);

  for (const branch of branches) {
    const commits = await listBranchCommits(ctx, branch._id);
    for (const commit of commits) {
      await ctx.db.delete(commit._id);
    }
    await ctx.db.delete(branch._id);
  }
};
