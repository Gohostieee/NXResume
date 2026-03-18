import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "../constants/llm";
import { buildProfilePatchFromResume } from "../lib/profile/suggestions";
import {
  buildGuidedAnalysisPrompt,
  getGuidedPresetById,
  getPresetById,
  type GuidedPresetId,
} from "../lib/ai/guided-resume-actions";
import {
  commitBranchSnapshot,
  ensureResumeHistory,
  extractSnapshotFromResume,
  getBranchHeadCommit,
  getResumeSnapshotHash,
  resolveActiveBranch,
  resolveDefaultResumeSnapshot,
} from "./resumeHistory";
import { getCareerProfileContextByUserId, upsertProfileSuggestion } from "./profileSupport";
import type {
  AiActionRequest,
  AiActionStagePreset,
  AiQueueItemResult,
  AiQueueResumeResult,
  ApplicationQueueSourceSnapshot,
  CoverLetterQueueSourceSnapshot,
  ResumeQueueSourceSnapshot,
} from "../lib/ai/queue-types";
import type { ResumeAiEditStrategy } from "../lib/ai/resume-ai-types";
import { hashResumeData } from "../lib/resume/proposal";

const guidedPresetValidator = v.union(
  v.literal("light_edit"),
  v.literal("cut_focus"),
  v.literal("one_page_shorten"),
  v.literal("keywords"),
  v.literal("role_pivot"),
  v.literal("overhaul"),
);

const quickPresetValidator = v.union(guidedPresetValidator, v.literal("perfect_resume"));

const sectionScopeValidator = v.union(
  v.literal("full_resume"),
  v.literal("summary_experience_skills"),
  v.literal("summary"),
  v.literal("experience"),
  v.literal("skills"),
);

const guidedAnswerValidator = v.object({
  id: v.string(),
  question: v.string(),
  reasoning: v.string(),
  answer: v.string(),
});

const coverLetterPresetValidator = v.union(
  v.literal("balanced"),
  v.literal("mission_culture"),
  v.literal("growth_ipo"),
);

const coverLetterFocusModuleValidator = v.union(
  v.literal("recent_achievements"),
  v.literal("company_mission"),
  v.literal("ipo_growth_signals"),
  v.literal("future_prospects"),
  v.literal("work_culture"),
);

const enqueueRequestValidator = v.union(
  v.object({
    kind: v.literal("resume.quick_apply"),
    resumeId: v.id("resumes"),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    presetId: quickPresetValidator,
    targetRole: v.string(),
  }),
  v.object({
    kind: v.literal("resume.guided_analyze"),
    resumeId: v.id("resumes"),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    presetId: v.union(guidedPresetValidator, v.null()),
    prompt: v.string(),
    targetRole: v.string(),
    sectionScope: sectionScopeValidator,
  }),
  v.object({
    kind: v.literal("resume.guided_apply"),
    resumeId: v.id("resumes"),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    presetId: v.union(guidedPresetValidator, v.null()),
    prompt: v.string(),
    targetRole: v.string(),
    sectionScope: sectionScopeValidator,
    answers: v.array(guidedAnswerValidator),
  }),
  v.object({
    kind: v.literal("application.extract"),
    applicationId: v.id("applications"),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("cover_letter.generate"),
    coverLetterId: v.id("coverLetters"),
    mode: v.union(v.literal("create"), v.literal("regenerate")),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    sourceVersion: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("resume.import_pdf"),
    resumeId: v.id("resumes"),
    model: v.optional(v.string()),
  }),
);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown AI queue failure";

const getStatusPriority = (status: string) => {
  if (status === "running") return 0;
  if (status === "queued") return 1;
  if (status === "action_required") return 2;
  if (status === "failed") return 3;
  return 4;
};

const sortQueueItems = <T extends { status: string; updatedAt: number; createdAt: number }>(
  items: T[],
) =>
  [...items].sort((left, right) => {
    const priorityDelta = getStatusPriority(left.status) - getStatusPriority(right.status);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    if (right.updatedAt !== left.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }

    return right.createdAt - left.createdAt;
  });

const getStagePresetForKind = (request: AiActionRequest): AiActionStagePreset => {
  if (request.kind === "application.extract") return "applicationIntake";
  if (request.kind === "cover_letter.generate") {
    return request.mode === "create" ? "coverLetterCreate" : "coverLetterRegenerate";
  }
  if (request.kind === "resume.import_pdf") return "resumePdfImport";
  if (request.kind === "resume.guided_analyze") return "guidedAnalyze";
  return "resumeApply";
};

const getDisplayTitle = (request: AiActionRequest) => {
  if (request.kind === "application.extract") {
    return "Extract Application Details";
  }

  if (request.kind === "cover_letter.generate") {
    return request.mode === "create" ? "Generate Cover Letter" : "Regenerate Cover Letter";
  }

  if (request.kind === "resume.import_pdf") {
    return "Import Resume PDF";
  }

  if (request.kind === "resume.quick_apply") {
    const preset = getPresetById(request.presetId);
    return preset?.title ?? "Quick Resume Action";
  }

  const label = request.presetId ? getGuidedPresetById(request.presetId).title : "Custom Prompt";
  return request.kind === "resume.guided_analyze" ? `${label} Analysis` : `${label} Guided Apply`;
};

const normalizeRequest = (request: any): AiActionRequest => {
  if (request.kind === "application.extract") {
    return {
      kind: request.kind,
      applicationId: request.applicationId,
      model: request.model?.trim() || DEFAULT_MODEL,
      maxTokens:
        typeof request.maxTokens === "number" && request.maxTokens > 0
          ? request.maxTokens
          : DEFAULT_MAX_TOKENS,
    };
  }

  if (request.kind === "cover_letter.generate") {
    return {
      kind: request.kind,
      coverLetterId: request.coverLetterId,
      mode: request.mode,
      model: request.model?.trim() || DEFAULT_MODEL,
      maxTokens:
        typeof request.maxTokens === "number" && request.maxTokens > 0
          ? request.maxTokens
          : DEFAULT_MAX_TOKENS,
      sourceVersion: request.sourceVersion,
    };
  }

  if (request.kind === "resume.import_pdf") {
    return {
      kind: request.kind,
      resumeId: request.resumeId,
      model: request.model?.trim() || DEFAULT_MODEL,
    };
  }

  return {
    ...request,
    resumeId: request.resumeId,
    model: request.model?.trim() || DEFAULT_MODEL,
    maxTokens:
      typeof request.maxTokens === "number" && request.maxTokens > 0
        ? request.maxTokens
        : DEFAULT_MAX_TOKENS,
    targetRole: request.targetRole.trim(),
    ...("prompt" in request ? { prompt: request.prompt.trim() } : {}),
    ...("answers" in request
      ? {
          answers: request.answers.map(
            (answer: { id: string; question: string; reasoning: string; answer: string }) => ({
              ...answer,
              question: answer.question.trim(),
              reasoning: answer.reasoning.trim(),
              answer: answer.answer.trim(),
            }),
          ),
        }
      : {}),
  } as AiActionRequest;
};

const requireUser = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const buildResumeQueueSourceSnapshot = async (
  ctx: any,
  resume: any,
): Promise<ResumeQueueSourceSnapshot> => {
  await ensureResumeHistory(ctx, resume, "create");
  const branch = await resolveActiveBranch(ctx, resume);
  const headCommit = branch ? await getBranchHeadCommit(ctx, branch) : null;
  const fallbackSnapshot = extractSnapshotFromResume(resume);
  const workingSnapshot = branch?.draftSnapshot ?? headCommit?.snapshot ?? fallbackSnapshot;
  const isTailoredResume = resume.scope === "application_tailored";
  const applicationId =
    isTailoredResume && typeof resume.applicationId === "string"
      ? ctx.db.normalizeId("applications", resume.applicationId)
      : null;

  const application = applicationId ? await ctx.db.get(applicationId) : null;
  if (isTailoredResume && !application) {
    throw new Error("Tailored resume is missing linked application context");
  }

  const careerProfile = await getCareerProfileContextByUserId(ctx, resume.userId);

  return {
    type: "resume",
    resumeId: resume._id,
    branchId: branch?._id,
    baseCommitId: branch?.headCommitId,
    resumeData: workingSnapshot.data,
    baseHash: hashResumeData(workingSnapshot.data),
    application: application
      ? {
          id: application._id,
          title: application.title,
          company: application.company,
          categories: application.categories ?? [],
          jobDescription: application.jobDescription,
          companyResearch: application.companyResearch,
        }
      : null,
    careerProfile,
  };
};

const buildApplicationQueueSourceSnapshot = async (
  application: any,
): Promise<ApplicationQueueSourceSnapshot> => ({
  type: "application",
  applicationId: application._id,
  jobDescription: application.jobDescription,
  title: application.title,
  company: application.company,
  categories: application.categories ?? [],
  companyResearch: application.companyResearch,
  updatedAt: application.updatedAt,
});

const buildCoverLetterQueueSourceSnapshot = async (
  ctx: any,
  coverLetter: any,
  request: Extract<AiActionRequest, { kind: "cover_letter.generate" }>,
): Promise<CoverLetterQueueSourceSnapshot> => {
  const application = await ctx.db.get(coverLetter.applicationId);
  if (!application) {
    throw new Error("Application not found");
  }

  const resume = await ctx.db.get(coverLetter.resumeId);
  if (!resume) {
    throw new Error("Resume not found");
  }

  const { snapshot } = await resolveDefaultResumeSnapshot(ctx, resume);
  const careerProfile = await getCareerProfileContextByUserId(ctx, coverLetter.userId);

  let previousDraft: string | undefined;
  if (request.mode === "regenerate" && request.sourceVersion) {
    const version = await ctx.db
      .query("coverLetterVersions")
      .withIndex("by_cover_letter_version", (q: any) =>
        q.eq("coverLetterId", coverLetter._id).eq("version", request.sourceVersion),
      )
      .first();

    previousDraft = version?.contentText;
  }

  return {
    type: "cover_letter",
    coverLetterId: coverLetter._id,
    mode: request.mode,
    sourceVersion: request.sourceVersion,
    resumeId: resume._id,
    resumeData: snapshot.data,
    application: {
      id: application._id,
      title: application.title,
      company: application.company,
      categories: application.categories ?? [],
      jobDescription: application.jobDescription,
      companyResearch: application.companyResearch,
    },
    careerProfile,
    preset: coverLetter.preset,
    focusModules: coverLetter.focusModules,
    customInstruction: coverLetter.customInstruction,
    previousDraft,
  };
};

const validateRequest = (request: AiActionRequest) => {
  if (request.kind === "application.extract") {
    return;
  }

  if (request.kind === "cover_letter.generate") {
    if (request.mode === "regenerate" && typeof request.sourceVersion !== "number") {
      throw new Error("Missing source version for cover letter regeneration.");
    }
    return;
  }

  if (request.kind === "resume.import_pdf") {
    return;
  }

  if (request.kind === "resume.quick_apply") {
    const preset = getPresetById(request.presetId);

    if (!preset) {
      throw new Error("Unknown AI preset");
    }

    if (preset.requiresTargetRole && request.targetRole.length === 0) {
      throw new Error("Choose a target role before running this action.");
    }

    return;
  }

  if (!buildGuidedAnalysisPrompt(request).trim()) {
    throw new Error("Prompt or preset is required for guided analysis.");
  }

  if (request.presetId) {
    const preset = getGuidedPresetById(request.presetId as GuidedPresetId);
    if (preset.requiresTargetRole && request.targetRole.length === 0) {
      throw new Error("Choose a target role before running this action.");
    }
  }
};

const getTargetIdentity = (request: AiActionRequest) => {
  if (request.kind === "application.extract") {
    return { targetType: "application", targetId: request.applicationId };
  }

  if (request.kind === "cover_letter.generate") {
    return { targetType: "cover_letter", targetId: request.coverLetterId };
  }

  return { targetType: "resume", targetId: request.resumeId };
};

export const enqueue = mutation({
  args: {
    request: enqueueRequestValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = normalizeRequest(args.request);
    validateRequest(request);

    const { targetType, targetId } = getTargetIdentity(request);

    const liveItems = await ctx.db
      .query("aiActions")
      .withIndex("by_target", (q) => q.eq("targetType", targetType).eq("targetId", targetId))
      .collect();

    if (liveItems.some((item) => item.status === "queued" || item.status === "running")) {
      throw new Error("This item already has an AI job in progress.");
    }

    let sourceSnapshot: any;

    if (request.kind === "application.extract") {
      const application = (await ctx.db.get(request.applicationId as Id<"applications">)) as
        | Doc<"applications">
        | null;
      if (!application) {
        throw new Error("Application not found");
      }
      if (application.userId !== user._id) {
        throw new Error("Unauthorized");
      }
      sourceSnapshot = await buildApplicationQueueSourceSnapshot(application);
      await ctx.db.patch(application._id, {
        extractionState: "pending",
        extractionError: undefined,
        extractionWarnings: undefined,
        updatedAt: Date.now(),
      });
    } else if (request.kind === "cover_letter.generate") {
      const coverLetter = (await ctx.db.get(request.coverLetterId as Id<"coverLetters">)) as
        | Doc<"coverLetters">
        | null;
      if (!coverLetter) {
        throw new Error("Cover letter not found");
      }
      if (coverLetter.userId !== user._id) {
        throw new Error("Unauthorized");
      }
      sourceSnapshot = await buildCoverLetterQueueSourceSnapshot(ctx, coverLetter, request);
      await ctx.db.patch(coverLetter._id, {
        generationState: "queued",
        generationError: undefined,
        updatedAt: Date.now(),
      });
    } else if (request.kind === "resume.import_pdf") {
      const resume = (await ctx.db.get(request.resumeId as Id<"resumes">)) as
        | Doc<"resumes">
        | null;
      if (!resume) {
        throw new Error("Resume not found");
      }
      if (resume.userId !== user._id) {
        throw new Error("Unauthorized");
      }
      if (!resume.importStorageId || !resume.importFilename) {
        throw new Error("Resume import file is missing.");
      }
      sourceSnapshot = {
        type: "resume_import_pdf",
        resumeId: resume._id,
        filename: resume.importFilename,
        storageId: resume.importStorageId,
      };
      await ctx.db.patch(resume._id, {
        importState: "pending",
        importError: undefined,
        locked: true,
        updatedAt: Date.now(),
      });
    } else {
      const resume = (await ctx.db.get(request.resumeId as Id<"resumes">)) as
        | Doc<"resumes">
        | null;
      if (!resume) {
        throw new Error("Resume not found");
      }

      if (resume.userId !== user._id) {
        throw new Error("Unauthorized");
      }

      if (resume.locked) {
        throw new Error("Resume is locked");
      }

      sourceSnapshot = await buildResumeQueueSourceSnapshot(ctx, resume);
    }

    const now = Date.now();

    const actionId = await ctx.db.insert("aiActions", {
      userId: user._id,
      kind: request.kind,
      status: "queued",
      targetType,
      targetId,
      displayTitle: getDisplayTitle(request),
      request,
      sourceSnapshot,
      stagePreset: getStagePresetForKind(request),
      stageIndex: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.aiQueueWorker.run, { actionId });

    return actionId;
  },
});

export const listForTarget = query({
  args: {
    targetType: v.string(),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const items = await ctx.db
      .query("aiActions")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .collect();

    return sortQueueItems(
      items.filter((item) => item.userId === user._id && item.status !== "completed"),
    );
  },
});

export const listForUser = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const items = await ctx.db
      .query("aiActions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return sortQueueItems(items.filter((item) => item.status !== "completed"));
  },
});

export const applyResult = mutation({
  args: {
    actionId: v.id("aiActions"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.actionId);

    if (!item) {
      throw new Error("Queue item not found");
    }

    if (item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (item.status !== "action_required") {
      throw new Error("Queue item is not waiting for review.");
    }

    const result = item.result as AiQueueItemResult | undefined;
    if (!result || result.type !== "resume_apply" || !result.resumeData) {
      throw new Error("Queue item has no reviewable resume result.");
    }

    const resumeId = ctx.db.normalizeId("resumes", item.targetId);
    if (!resumeId) {
      throw new Error("Resume not found");
    }

    const resume = await ctx.db.get(resumeId);
    if (!resume) {
      throw new Error("Resume not found");
    }

    if (resume.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (resume.locked) {
      throw new Error("Resume is locked");
    }

    await ensureResumeHistory(ctx, resume, "create");
    const sourceSnapshot = item.sourceSnapshot as ResumeQueueSourceSnapshot;
    const branchId = sourceSnapshot.branchId
      ? ctx.db.normalizeId("resumeBranches", sourceSnapshot.branchId)
      : undefined;
    const branch = await resolveActiveBranch(ctx, resume, branchId ?? undefined);
    if (!branch || branch.resumeId !== resume._id) {
      throw new Error("Branch not found");
    }

    const currentSnapshot =
      branch.draftSnapshot ??
      (await getBranchHeadCommit(ctx, branch))?.snapshot ??
      extractSnapshotFromResume(resume);

    if (hashResumeData(currentSnapshot.data) !== result.baseHash) {
      throw new Error("Resume changed since this AI draft was generated. Rerun the AI action.");
    }

    const now = Date.now();
    const headCommit = await getBranchHeadCommit(ctx, branch);
    const headSnapshot = headCommit?.snapshot ?? extractSnapshotFromResume(resume);

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
    if (!freshBranch) {
      throw new Error("Branch not found");
    }

    await commitBranchSnapshot(ctx, {
      resume,
      branch: freshBranch,
      snapshot: {
        title: currentSnapshot.title,
        visibility: currentSnapshot.visibility,
        data: result.resumeData,
      },
      changeKind: "ai",
      changeSource: "ai_queue",
      changedPaths: ["data"],
      authorId: user._id,
      message: "Applied AI queue changes",
      summary: "Applied AI queue changes",
    });

    await upsertProfileSuggestion(ctx, {
      userId: user._id,
      sourceType: "resume_snapshot",
      sourceId: resume._id,
      proposedPatch: buildProfilePatchFromResume(result.resumeData),
    });

    await ctx.db.patch(item._id, {
      status: "completed",
      result: {
        ...result,
        autoApplied: false,
        requiresReview: false,
        appliedAt: now,
        appliedByUser: true,
      },
      updatedAt: now,
      finishedAt: now,
    });

    return item._id;
  },
});

export const dismiss = mutation({
  args: {
    actionId: v.id("aiActions"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.actionId);

    if (!item) {
      return null;
    }

    if (item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (item.status === "queued" || item.status === "running") {
      throw new Error("Cannot dismiss an in-progress queue item.");
    }

    await ctx.db.delete(item._id);
    return item._id;
  },
});

export const claimRunning = internalMutation({
  args: {
    actionId: v.id("aiActions"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.actionId);

    if (!item || item.status !== "queued") {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: "running",
      updatedAt: now,
      startedAt: item.startedAt ?? now,
      stageIndex: 0,
    });

    return {
      ...item,
      status: "running" as const,
      updatedAt: now,
      startedAt: item.startedAt ?? now,
      stageIndex: 0,
    };
  },
});

export const setStage = internalMutation({
  args: {
    actionId: v.id("aiActions"),
    stageIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.actionId);
    if (!item) {
      return null;
    }

    await ctx.db.patch(item._id, {
      stageIndex: args.stageIndex,
      updatedAt: Date.now(),
    });

    return item._id;
  },
});

export const markAnalysisReady = internalMutation({
  args: {
    actionId: v.id("aiActions"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.actionId);
    if (!item) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: "action_required",
      result: args.result,
      error: undefined,
      stageIndex: 3,
      updatedAt: now,
      finishedAt: now,
    });

    return item._id;
  },
});

export const finalizeResumeResult = internalMutation({
  args: {
    actionId: v.id("aiActions"),
    instruction: v.string(),
    strategy: v.union(v.literal("editor"), v.literal("generator")),
    generatedResume: v.any(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.actionId);
    if (!item) {
      return null;
    }

    const resumeId = ctx.db.normalizeId("resumes", item.targetId);
    if (!resumeId) {
      throw new Error("Resume not found");
    }

    const resume = await ctx.db.get(resumeId);
    if (!resume) {
      throw new Error("Resume not found");
    }

    const snapshot = item.sourceSnapshot as ResumeQueueSourceSnapshot;
    const now = Date.now();
    const baseResult: AiQueueResumeResult = {
      type: "resume_apply",
      instruction: args.instruction,
      strategy: args.strategy as ResumeAiEditStrategy,
      autoApplied: false,
      requiresReview: false,
      baseHash: snapshot.baseHash,
    };

    await ctx.db.patch(item._id, {
      status: "action_required",
      result: {
        ...baseResult,
        autoApplied: false,
        requiresReview: true,
        resumeData: args.generatedResume,
      },
      error: undefined,
      stageIndex: 3,
      updatedAt: now,
      finishedAt: now,
    });

    return "action_required";
  },
});

export const markCompleted = internalMutation({
  args: {
    actionId: v.id("aiActions"),
    result: v.optional(v.any()),
    stageIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.actionId);
    if (!item) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: "completed",
      result: args.result,
      error: undefined,
      stageIndex: args.stageIndex ?? item.stageIndex,
      updatedAt: now,
      finishedAt: now,
    });

    return item._id;
  },
});

export const markFailed = internalMutation({
  args: {
    actionId: v.id("aiActions"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.actionId);
    if (!item) {
      return null;
    }

    await ctx.db.patch(item._id, {
      status: "failed",
      error: { message: args.message },
      updatedAt: Date.now(),
      finishedAt: Date.now(),
    });

    return item._id;
  },
});

export const getForWorker = internalQuery({
  args: {
    actionId: v.id("aiActions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.actionId);
  },
});
