"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
  buildGuidedResumeInstruction,
  buildPresetInstruction,
  getPresetById,
} from "../lib/ai/guided-resume-actions";
import { extractApplicationFromDescriptionWithAi } from "../lib/ai/application-intake";
import {
  type AiQueueAnalysisResult,
  type ApplicationQueueSourceSnapshot,
  type CoverLetterQueueSourceSnapshot,
  type ResumeImportQueueSourceSnapshot,
  type ResumeQueueSourceSnapshot,
} from "../lib/ai/queue-types";
import { generateCoverLetterWithAi } from "../lib/ai/cover-letter-generator";
import { importResumeFromPdf } from "../lib/ai/pdf-resume-importer";
import { runResumeAnalysis, runResumeEdit } from "../lib/ai/resume-ai-server";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "AI queue worker failed";

const handleApplicationExtract = async (
  ctx: any,
  args: { actionId: any; item: any },
): Promise<"completed"> => {
  const request = args.item.request as Extract<any, { kind: "application.extract" }>;
  const snapshot = args.item.sourceSnapshot as ApplicationQueueSourceSnapshot;
  const applicationId = args.item.targetId as any;

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 1,
  });

  const result = await extractApplicationFromDescriptionWithAi({
    jobDescription: snapshot.jobDescription,
    model: request.model,
    maxTokens: request.maxTokens,
  });

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 2,
  });

  await ctx.runMutation(internal.applications.completeExtraction, {
    id: applicationId,
    title: result.title,
    company: result.company,
    companyResearch: result.companyResearch,
    categories: result.categories,
    warnings: [result.warning, result.companyResearchWarning].filter(Boolean),
  });

  await ctx.runMutation(internal.aiQueue.markCompleted, {
    actionId: args.actionId,
    result: {
      type: "application_extract",
      warning: result.warning,
      companyResearchWarning: result.companyResearchWarning,
      autoApplied: true,
    },
    stageIndex: 3,
  });

  return "completed";
};

const handleCoverLetterGenerate = async (
  ctx: any,
  args: { actionId: any; item: any },
): Promise<"completed"> => {
  const request = args.item.request as Extract<any, { kind: "cover_letter.generate" }>;
  const snapshot = args.item.sourceSnapshot as CoverLetterQueueSourceSnapshot;
  const coverLetterId = args.item.targetId as any;

  await ctx.runMutation(internal.coverLetters.setGenerationState, {
    id: coverLetterId,
    state: "running",
  });

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 1,
  });

  const result = await generateCoverLetterWithAi({
    resume: snapshot.resumeData,
    application: snapshot.application,
    profile: snapshot.careerProfile,
    preset: snapshot.preset,
    focusModules: snapshot.focusModules,
    customInstruction: snapshot.customInstruction,
    previousDraft: snapshot.previousDraft,
    model: request.model,
    maxTokens: request.maxTokens,
  });

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 2,
  });

  await ctx.runMutation(internal.coverLetters.completeGeneration, {
    id: coverLetterId,
    mode: request.mode,
    title: result.titleSuggestion,
    contentHtml: result.contentHtml,
    contentText: result.contentText,
    generationContext: {
      generationNotes: result.generationNotes,
      preset: snapshot.preset,
      focusModules: snapshot.focusModules,
      customInstruction: snapshot.customInstruction,
      generatedAt: Date.now(),
    },
    sourceVersion: snapshot.sourceVersion,
  });

  await ctx.runMutation(internal.aiQueue.markCompleted, {
    actionId: args.actionId,
    result: {
      type: "cover_letter_generate",
      autoApplied: true,
      mode: request.mode,
    },
    stageIndex: 3,
  });

  return "completed";
};

const handleResumeImportPdf = async (
  ctx: any,
  args: { actionId: any; item: any },
): Promise<"completed"> => {
  const request = args.item.request as Extract<any, { kind: "resume.import_pdf" }>;
  const snapshot = args.item.sourceSnapshot as ResumeImportQueueSourceSnapshot;
  const resumeId = args.item.targetId as any;
  const storageId = snapshot.storageId as any;

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 1,
  });

  const fileBlob = await ctx.storage.get(storageId);
  if (!fileBlob) {
    throw new Error("Resume import file is no longer available.");
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const resume = await importResumeFromPdf({
    filename: snapshot.filename,
    pdfBase64: Buffer.from(arrayBuffer).toString("base64"),
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: request.model,
  });

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 2,
  });

  await ctx.runMutation(internal.resumes.completePdfImport, {
    id: resumeId,
    data: resume,
  });

  await ctx.runMutation(internal.storage.deleteFileInternal, {
    storageId,
  });

  await ctx.runMutation(internal.aiQueue.markCompleted, {
    actionId: args.actionId,
    result: {
      type: "resume_import_pdf",
      autoApplied: true,
    },
    stageIndex: 3,
  });

  return "completed";
};

const handleResumeQueueRequest = async (ctx: any, args: { actionId: any; item: any }) => {
  const request = args.item.request as any;
  const sourceSnapshot = args.item.sourceSnapshot as ResumeQueueSourceSnapshot;
  const hasApplicationContext = Boolean(sourceSnapshot.application);

  if (request.kind === "resume.guided_analyze") {
    await ctx.runMutation(internal.aiQueue.setStage, {
      actionId: args.actionId,
      stageIndex: 1,
    });

    const issues = await runResumeAnalysis({
      resume: sourceSnapshot.resumeData,
      profile: sourceSnapshot.careerProfile ?? undefined,
      application: sourceSnapshot.application ?? undefined,
      presetId: request.presetId ?? null,
      prompt: request.prompt,
      targetRole: request.targetRole,
      sectionScope: request.sectionScope,
      model: request.model,
    });

    await ctx.runMutation(internal.aiQueue.setStage, {
      actionId: args.actionId,
      stageIndex: 2,
    });

    const result: AiQueueAnalysisResult = {
      type: "analysis",
      draft: {
        presetId: request.presetId ?? null,
        prompt: request.prompt,
        targetRole: request.targetRole,
        sectionScope: request.sectionScope,
      },
      issues,
    };

    await ctx.runMutation(internal.aiQueue.markAnalysisReady, {
      actionId: args.actionId,
      result,
    });

    return "action_required";
  }

  const instruction =
    request.kind === "resume.quick_apply"
      ? buildPresetInstruction(request.presetId, request.targetRole, {
          hasApplicationContext,
        })
      : buildGuidedResumeInstruction(
          {
            presetId: request.presetId ?? null,
            prompt: request.prompt,
            targetRole: request.targetRole,
            sectionScope: request.sectionScope,
            answers: request.answers,
          },
          {
            hasApplicationContext,
          },
        );

  const strategy =
    request.kind === "resume.quick_apply"
      ? (getPresetById(request.presetId)?.strategy ?? "generator")
      : "generator";

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 1,
  });

  const generatedResume = await runResumeEdit({
    strategy,
    instruction,
    resume: sourceSnapshot.resumeData,
    profile: sourceSnapshot.careerProfile ?? undefined,
    application: sourceSnapshot.application ?? undefined,
    model: request.model,
    maxTokens: request.maxTokens,
  });

  await ctx.runMutation(internal.aiQueue.setStage, {
    actionId: args.actionId,
    stageIndex: 2,
  });

  return await ctx.runMutation(internal.aiQueue.finalizeResumeResult, {
    actionId: args.actionId,
    instruction,
    strategy,
    generatedResume,
  });
};

export const run = internalAction({
  args: {
    actionId: v.id("aiActions"),
  },
  handler: async (ctx, args): Promise<"action_required" | "completed" | "failed" | null> => {
    const item = await ctx.runMutation(internal.aiQueue.claimRunning, {
      actionId: args.actionId,
    });

    if (!item) {
      return null;
    }

    try {
      if (item.kind === "application.extract") {
        return await handleApplicationExtract(ctx, { actionId: args.actionId, item });
      }

      if (item.kind === "cover_letter.generate") {
        return await handleCoverLetterGenerate(ctx, { actionId: args.actionId, item });
      }

      if (item.kind === "resume.import_pdf") {
        return await handleResumeImportPdf(ctx, { actionId: args.actionId, item });
      }

      return await handleResumeQueueRequest(ctx, { actionId: args.actionId, item });
    } catch (error) {
      if (item.kind === "application.extract") {
        await ctx.runMutation(internal.applications.failExtraction, {
          id: item.targetId as any,
          message: getErrorMessage(error),
        });
      }

      if (item.kind === "cover_letter.generate") {
        await ctx.runMutation(internal.coverLetters.setGenerationState, {
          id: item.targetId as any,
          state: "failed",
          error: getErrorMessage(error),
        });
      }

      if (item.kind === "resume.import_pdf") {
        await ctx.runMutation(internal.resumes.failPdfImport, {
          id: item.targetId as any,
          message: getErrorMessage(error),
        });
      }

      await ctx.runMutation(internal.aiQueue.markFailed, {
        actionId: args.actionId,
        message: getErrorMessage(error),
      });

      return "failed";
    }
  },
});
