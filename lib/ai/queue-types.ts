import type { ResumeData } from "../schema";
import type {
  GuidedRunAnswer,
  GuidedRunDraft,
  GuidedPresetId,
  QuickPresetId,
  SectionScopeId,
} from "./guided-resume-actions";
import type { CoverLetterFocusModule, CoverLetterPreset } from "./cover-letter-types";
import type {
  GuidedRunIssue,
  ResumeAiApplicationContext,
  ResumeAiEditStrategy,
  ResumeAiProfileContext,
} from "./resume-ai-types";
import type { CompanyResearchDetails } from "./application-intake-types";

export type KnownAiActionKind =
  | "resume.quick_apply"
  | "resume.guided_analyze"
  | "resume.guided_apply"
  | "application.extract"
  | "cover_letter.generate"
  | "resume.import_pdf";

export type AiActionKind = KnownAiActionKind | (string & {});

export type AiActionStatus = "queued" | "running" | "action_required" | "completed" | "failed";

export type AiActionStagePreset =
  | "applicationIntake"
  | "coverLetterCreate"
  | "coverLetterRegenerate"
  | "resumeApply"
  | "guidedAnalyze"
  | "resumePdfImport";

export type ResumeQuickApplyRequest = {
  kind: "resume.quick_apply";
  resumeId: string;
  model: string;
  maxTokens: number;
  presetId: QuickPresetId;
  targetRole: string;
};

export type ResumeGuidedAnalyzeRequest = {
  kind: "resume.guided_analyze";
  resumeId: string;
  model: string;
  maxTokens: number;
  presetId: GuidedPresetId | null;
  prompt: string;
  targetRole: string;
  sectionScope: SectionScopeId;
};

export type ResumeGuidedApplyRequest = {
  kind: "resume.guided_apply";
  resumeId: string;
  model: string;
  maxTokens: number;
  presetId: GuidedPresetId | null;
  prompt: string;
  targetRole: string;
  sectionScope: SectionScopeId;
  answers: GuidedRunAnswer[];
};

export type ApplicationExtractRequest = {
  kind: "application.extract";
  applicationId: string;
  model: string;
  maxTokens: number;
};

export type CoverLetterGenerateRequest = {
  kind: "cover_letter.generate";
  coverLetterId: string;
  mode: "create" | "regenerate";
  model: string;
  maxTokens: number;
  sourceVersion?: number;
};

export type ResumeImportPdfRequest = {
  kind: "resume.import_pdf";
  resumeId: string;
  model: string;
};

export type AiActionRequest =
  | ResumeQuickApplyRequest
  | ResumeGuidedAnalyzeRequest
  | ResumeGuidedApplyRequest
  | ApplicationExtractRequest
  | CoverLetterGenerateRequest
  | ResumeImportPdfRequest;

export type ResumeQueueSourceSnapshot = {
  type: "resume";
  resumeId: string;
  branchId?: string;
  baseCommitId?: string;
  resumeData: ResumeData;
  baseHash: string;
  application: ResumeAiApplicationContext | null;
  careerProfile: ResumeAiProfileContext | null;
};

export type ApplicationQueueSourceSnapshot = {
  type: "application";
  applicationId: string;
  jobDescription: string;
  title: string;
  company: string;
  categories: string[];
  companyResearch?: CompanyResearchDetails;
  updatedAt: number;
};

export type CoverLetterQueueSourceSnapshot = {
  type: "cover_letter";
  coverLetterId: string;
  mode: "create" | "regenerate";
  sourceVersion?: number;
  resumeId: string;
  resumeData: ResumeData;
  application: ResumeAiApplicationContext;
  careerProfile: ResumeAiProfileContext | null;
  preset: CoverLetterPreset;
  focusModules: CoverLetterFocusModule[];
  customInstruction?: string;
  previousDraft?: string;
};

export type ResumeImportQueueSourceSnapshot = {
  type: "resume_import_pdf";
  resumeId: string;
  filename: string;
  storageId: string;
};

export type AiQueueSourceSnapshot =
  | ResumeQueueSourceSnapshot
  | ApplicationQueueSourceSnapshot
  | CoverLetterQueueSourceSnapshot
  | ResumeImportQueueSourceSnapshot;

export type AiQueueAnalysisResult = {
  type: "analysis";
  draft: GuidedRunDraft;
  issues: GuidedRunIssue[];
};

export type AiQueueResumeResult = {
  type: "resume_apply";
  instruction: string;
  strategy: ResumeAiEditStrategy;
  autoApplied: boolean;
  requiresReview: boolean;
  baseHash: string;
  appliedAt?: number;
  appliedByUser?: boolean;
  resumeData?: ResumeData;
};

export type AiQueueItemResult = AiQueueAnalysisResult | AiQueueResumeResult | null;

export type AiQueueError = {
  message: string;
};

export type AiQueueItem = {
  _id: string;
  kind: AiActionKind;
  status: AiActionStatus;
  targetType: string;
  targetId: string;
  displayTitle: string;
  request: AiActionRequest;
  sourceSnapshot: AiQueueSourceSnapshot;
  result?: AiQueueItemResult;
  error?: AiQueueError;
  stagePreset: AiActionStagePreset;
  stageIndex: number;
  userId: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  finishedAt?: number;
};

export const AI_QUEUE_LIVE_STATUSES: AiActionStatus[] = ["queued", "running"];

export const isGuidedAnalyzeRequest = (
  request: AiActionRequest,
): request is ResumeGuidedAnalyzeRequest => request.kind === "resume.guided_analyze";

export const isGuidedApplyRequest = (
  request: AiActionRequest,
): request is ResumeGuidedApplyRequest => request.kind === "resume.guided_apply";

export const isQuickApplyRequest = (request: AiActionRequest): request is ResumeQuickApplyRequest =>
  request.kind === "resume.quick_apply";

export const isApplicationExtractRequest = (
  request: AiActionRequest,
): request is ApplicationExtractRequest => request.kind === "application.extract";

export const isCoverLetterGenerateRequest = (
  request: AiActionRequest,
): request is CoverLetterGenerateRequest => request.kind === "cover_letter.generate";

export const isResumeImportPdfRequest = (
  request: AiActionRequest,
): request is ResumeImportPdfRequest => request.kind === "resume.import_pdf";

export const isAnalysisResult = (
  result: AiQueueItemResult | undefined,
): result is AiQueueAnalysisResult => result?.type === "analysis";

export const isResumeResult = (
  result: AiQueueItemResult | undefined,
): result is AiQueueResumeResult => result?.type === "resume_apply";
