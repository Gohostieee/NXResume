"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { FileText, PencilSimple, Sparkle } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AI_LOADING_PRESETS } from "@/lib/ai/loading-presets";
import {
  AI_ACTION_PRESETS,
  SECTION_SCOPE_OPTIONS,
  buildGuidedResumeInstruction,
  getGuidedPresetById,
  getSectionScopeById,
  type GuidedPresetId,
  type GuidedRunAnswer,
  type GuidedRunDraft,
  type QuickPresetId,
} from "@/lib/ai/guided-resume-actions";
import type { CompanyResearchDetails } from "@/lib/ai/application-intake-types";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/constants/llm";
import { isAnalysisResult, isResumeResult, type AiQueueItem } from "@/lib/ai/queue-types";
import { buildProfileContextSummary, getPreferredTargetRole } from "@/lib/profile/ui-assist";
import { hashResumeData } from "@/lib/resume/proposal";
import { useOpenAiStore } from "@/stores/openai";
import { useResumeStore } from "@/stores/resume";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToastAction, toast } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ApplicationContext = {
  _id: string;
  title: string;
  company: string;
  categories?: string[];
  jobDescription: string;
  companyResearch?: CompanyResearchDetails;
};

type GuidedStep = "intent" | "analyze" | "clarify" | "review";

const TARGET_ROLE_OPTIONS = [
  { value: "software engineer", label: "Software Engineer" },
  { value: "sales representative", label: "Sales Representative" },
  { value: "account executive", label: "Account Executive" },
  { value: "product manager", label: "Product Manager" },
  { value: "marketing manager", label: "Marketing Manager" },
  { value: "customer success manager", label: "Customer Success" },
  { value: "operations manager", label: "Operations" },
  { value: "data analyst", label: "Data Analyst" },
  { value: "custom", label: "Custom Role" },
] as const;

const GUIDED_STEP_ORDER: { id: GuidedStep; label: string }[] = [
  { id: "intent", label: "Intent" },
  { id: "analyze", label: "Analyze" },
  { id: "clarify", label: "Clarify" },
  { id: "review", label: "Review" },
];

const GUIDED_SKIP_ANSWER = "Not applicable. No additional details to add.";

const createGuidedDraft = (input?: Partial<GuidedRunDraft>): GuidedRunDraft => ({
  presetId: input?.presetId ?? null,
  prompt: input?.prompt ?? "",
  targetRole: input?.targetRole ?? "",
  sectionScope: input?.sectionScope ?? "full_resume",
});

const getImpactBadge = (impact: "low" | "medium" | "high") => {
  if (impact === "low") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (impact === "medium") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-rose-100 text-rose-900 border-rose-200";
};

const getQueueStatusBadge = (status: AiQueueItem["status"]) => {
  if (status === "queued") return "border-slate-200 bg-slate-100 text-slate-900";
  if (status === "running") return "border-sky-200 bg-sky-100 text-sky-900";
  if (status === "action_required") return "border-amber-200 bg-amber-100 text-amber-900";
  if (status === "failed") return "border-rose-200 bg-rose-100 text-rose-900";
  return "border-emerald-200 bg-emerald-100 text-emerald-900";
};

const formatQueueStatus = (status: AiQueueItem["status"]) => {
  if (status === "action_required") return "Action Required";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatTimestamp = (value?: number) => {
  if (!value) return null;
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDuration = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const getStageLabel = (item: AiQueueItem) => {
  const preset = AI_LOADING_PRESETS[item.stagePreset];
  return preset?.stages[item.stageIndex] ?? "Waiting for next step";
};

export function AiActionsTab({
  application,
}: {
  application: ApplicationContext | null | undefined;
}) {
  const resume = useResumeStore((state) => state.resume);
  const activeBranch = useResumeStore((state) => state.activeBranch);
  const checkedOutCommitId = useResumeStore((state) => state.checkedOutCommitId);
  const proposal = useResumeStore((state) => state.proposal);
  const setProposalDraft = useResumeStore((state) => state.setProposalDraft);
  const openProposalPreview = useResumeStore((state) => state.openProposalPreview);
  const discardProposalDraft = useResumeStore((state) => state.discardProposalDraft);
  const { model, maxTokens } = useOpenAiStore();
  const enqueueAction = useMutation(api.aiQueue.enqueue);
  const dismissQueueItem = useMutation(api.aiQueue.dismiss);
  const profileContext = useQuery(api.careerProfiles.getContext);
  const queueItems =
    useQuery(
      api.aiQueue.listForTarget,
      resume?.id || resume?._id
        ? {
            targetType: "resume",
            targetId: (resume.id || resume._id) as string,
          }
        : "skip",
    ) ?? [];
  const queueSectionRef = useRef<HTMLDivElement | null>(null);

  const [queueError, setQueueError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [targetRolePreset, setTargetRolePreset] = useState<string>("software engineer");
  const [customRole, setCustomRole] = useState("");
  const [hasEditedTargetRole, setHasEditedTargetRole] = useState(false);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedStep, setGuidedStep] = useState<GuidedStep>("intent");
  const [guidedDraft, setGuidedDraft] = useState<GuidedRunDraft>(
    createGuidedDraft({ targetRole: "" }),
  );
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedRunAnswer[]>([]);
  const [guidedError, setGuidedError] = useState<string | null>(null);
  const [activeAnalysisItemId, setActiveAnalysisItemId] = useState<Id<"aiActions"> | null>(null);
  const [submitting, setSubmitting] = useState<"quick" | "analyze" | "apply" | null>(null);
  const [dismissingItemId, setDismissingItemId] = useState<Id<"aiActions"> | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const seenDraftIdsRef = useRef(new Set<string>());

  const isTailoredResume = resume?.scope === "application_tailored";
  const hasResume = Boolean(resume?.data);
  const isLocked = Boolean(resume?.locked);
  const isReadonlyCommitView =
    Boolean(checkedOutCommitId) && checkedOutCommitId !== activeBranch?.headCommitId;
  const canUseAi =
    hasResume && !isLocked && !isReadonlyCommitView && (!isTailoredResume || Boolean(application));
  const quickPresets = useMemo(() => AI_ACTION_PRESETS.filter((preset) => preset.quickEnabled), []);
  const liveQueueItem = queueItems.find(
    (item) => item.status === "queued" || item.status === "running",
  );
  const canQueueAction = canUseAi && !liveQueueItem && submitting === null;
  const contextLabel = isTailoredResume ? "Job Context" : "Resume Context";
  const contextTitle = isTailoredResume
    ? `${application?.title ?? "Unknown role"} at ${application?.company ?? "Unknown company"}`
    : resume?.title?.trim() || "General Resume";
  const contextDescription = isTailoredResume
    ? "AI actions queue server-side and return a review draft in the preview before anything is saved."
    : "AI actions queue server-side and return a review draft in the preview before anything is saved. Without a linked job, actions use your resume, career profile, and target role.";
  const contextBadge = isTailoredResume ? "Tailored AI" : "General AI";
  const queueDescription = isTailoredResume
    ? "Active and reviewable AI jobs for this tailored resume."
    : "Active and reviewable AI jobs for this resume.";
  const promptDescription = isTailoredResume
    ? "Best for tailored rewrites, custom asks, and ambiguous changes."
    : "Best for custom rewrites, role pivots, and ambiguous changes.";
  const preferredTargetRole = getPreferredTargetRole(profileContext);
  const missingSignals = profileContext?.missingSignals ?? [];
  const profileContextSummary = buildProfileContextSummary(profileContext);

  useEffect(() => {
    if (!profileContext || hasEditedTargetRole) return;

    const preferredRole = getPreferredTargetRole(profileContext);
    if (!preferredRole) return;

    const matchingOption = TARGET_ROLE_OPTIONS.find(
      (option) => option.value !== "custom" && option.value.toLowerCase() === preferredRole.toLowerCase(),
    );

    if (matchingOption) {
      setTargetRolePreset(matchingOption.value);
      setCustomRole("");
      return;
    }

    setTargetRolePreset("custom");
    setCustomRole(preferredRole);
  }, [hasEditedTargetRole, profileContext]);

  useEffect(() => {
    const hasActiveItem = queueItems.some(
      (item) => item.status === "queued" || item.status === "running",
    );

    if (!hasActiveItem) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [queueItems]);

  useEffect(() => {
    const draftItem = queueItems.find(
      (item) =>
        item.status === "action_required" &&
        isResumeResult(item.result) &&
        item.result.requiresReview &&
        item.result.resumeData,
    );

    if (!draftItem || !isResumeResult(draftItem.result)) {
      return;
    }

    if (
      proposal.source === "ai_queue" &&
      proposal.sourceActionId === draftItem._id &&
      proposal.proposalSnapshot
    ) {
      return;
    }

    if (seenDraftIdsRef.current.has(draftItem._id)) {
      return;
    }

    const openPreview =
      hashResumeData(useResumeStore.getState().resume?.data) === draftItem.result.baseHash;

    setProposalDraft({
      source: "ai_queue",
      sourceActionId: draftItem._id,
      baseSnapshot: draftItem.sourceSnapshot.resumeData as typeof resume.data,
      proposalSnapshot: draftItem.result.resumeData as typeof resume.data,
      baseHash: draftItem.result.baseHash,
      createdAt: draftItem.finishedAt,
      message: openPreview
        ? "The AI draft is open in the preview. Apply it or discard it when you are done reviewing."
        : "The AI draft is ready. Preview it before applying because the resume changed while the job was running.",
      openPreview,
    });

    seenDraftIdsRef.current.add(draftItem._id);

    toast({
      variant: "success",
      title: "AI action finished",
      description: openPreview
        ? "The proposed draft is already visible in the resume preview."
        : "The proposed draft is ready. Open Preview to compare it before applying.",
      action: openPreview ? undefined : (
        <ToastAction altText="Preview draft" onClick={openProposalPreview}>
          Preview
        </ToastAction>
      ),
    });
  }, [
    openProposalPreview,
    proposal.proposalSnapshot,
    proposal.source,
    proposal.sourceActionId,
    queueItems,
    setProposalDraft,
  ]);

  const resolvedTargetRole = useMemo(() => {
    if (targetRolePreset === "custom") {
      return customRole.trim();
    }
    return targetRolePreset;
  }, [customRole, targetRolePreset]);

  const guidedPreset = useMemo(
    () => (guidedDraft.presetId ? getGuidedPresetById(guidedDraft.presetId) : null),
    [guidedDraft.presetId],
  );

  const guidedInstructionPreview = useMemo(
    () => buildGuidedResumeInstruction({ ...guidedDraft, answers: guidedAnswers }),
    [guidedAnswers, guidedDraft],
  );

  const canAdvanceGuided = useMemo(() => {
    if (!guidedDraft.presetId && guidedDraft.prompt.trim().length === 0) {
      return false;
    }

    if (guidedPreset?.requiresTargetRole && guidedDraft.targetRole.trim().length === 0) {
      return false;
    }

    return true;
  }, [guidedDraft, guidedPreset]);

  const canContinueClarify = guidedAnswers.every((answer) => answer.answer.trim().length > 0);
  const guidedScope = getSectionScopeById(guidedDraft.sectionScope);
  const currentStepIndex = GUIDED_STEP_ORDER.findIndex((step) => step.id === guidedStep);

  const resetGuidedFlow = () => {
    setGuidedOpen(false);
    setGuidedStep("intent");
    setGuidedDraft(createGuidedDraft({ targetRole: resolvedTargetRole || preferredTargetRole }));
    setGuidedAnswers([]);
    setGuidedError(null);
    setActiveAnalysisItemId(null);
  };

  const scrollToQueueSection = () => {
    window.requestAnimationFrame(() => {
      queueSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const runEnqueue = async (request: Parameters<typeof enqueueAction>[0]["request"]) => {
    setQueueError(null);
    await enqueueAction({ request });
  };

  const handleQuickRun = async (presetId: QuickPresetId) => {
    if (!canQueueAction || !resume?.id) return;

    const preset = AI_ACTION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    if (preset.requiresTargetRole && !resolvedTargetRole) {
      setQueueError("Choose a target role before running this action.");
      return;
    }

    setSubmitting("quick");

    try {
      await runEnqueue({
        kind: "resume.quick_apply",
        resumeId: resume.id as Id<"resumes">,
        model: model ?? DEFAULT_MODEL,
        maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        presetId,
        targetRole: resolvedTargetRole,
      });
      scrollToQueueSection();
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Failed to enqueue AI action.");
    } finally {
      setSubmitting(null);
    }
  };

  const openGuidedRun = ({
    presetId,
    prompt,
    targetRole,
    sectionScope,
  }: Partial<GuidedRunDraft> = {}) => {
    setGuidedDraft(
      createGuidedDraft({
        presetId: presetId ?? null,
        prompt: prompt ?? "",
        targetRole:
          targetRole ??
          resolvedTargetRole ??
          (targetRolePreset === "custom" ? customRole.trim() : targetRolePreset),
        sectionScope,
      }),
    );
    setGuidedAnswers([]);
    setGuidedError(null);
    setGuidedStep("intent");
    setActiveAnalysisItemId(null);
    setGuidedOpen(true);
  };

  const handleOpenGuidedFromPrompt = () => {
    setQueueError(null);
    openGuidedRun({ prompt: customPrompt.trim(), targetRole: resolvedTargetRole });
  };

  const handleAnalyzeGuidedRun = async () => {
    if (!canQueueAction || !resume?.id) return;

    setSubmitting("analyze");
    setGuidedError(null);

    try {
      await runEnqueue({
        kind: "resume.guided_analyze",
        resumeId: resume.id as Id<"resumes">,
        model: model ?? DEFAULT_MODEL,
        maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        presetId: guidedDraft.presetId,
        prompt: guidedDraft.prompt,
        targetRole: guidedDraft.targetRole,
        sectionScope: guidedDraft.sectionScope,
      });
      setGuidedOpen(false);
      setGuidedStep("analyze");
      setGuidedAnswers([]);
      scrollToQueueSection();
    } catch (error) {
      setGuidedError(error instanceof Error ? error.message : "Failed to enqueue guided analysis.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleContinueFromAnalysis = (item: AiQueueItem) => {
    if (!isAnalysisResult(item.result)) {
      return;
    }

    setGuidedDraft(createGuidedDraft(item.result.draft));
    setGuidedAnswers(
      item.result.issues.map((issue) => ({
        id: issue.id,
        question: issue.question,
        reasoning: issue.reasoning,
        answer: "",
      })),
    );
    setGuidedError(null);
    setGuidedStep(item.result.issues.length > 0 ? "clarify" : "review");
    setActiveAnalysisItemId(item._id as Id<"aiActions">);
    setGuidedOpen(true);
  };

  const handleApplyGuidedRun = async () => {
    if (!canQueueAction || !resume?.id) return;

    setSubmitting("apply");
    setGuidedError(null);

    try {
      await runEnqueue({
        kind: "resume.guided_apply",
        resumeId: resume.id as Id<"resumes">,
        model: model ?? DEFAULT_MODEL,
        maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        presetId: guidedDraft.presetId,
        prompt: guidedDraft.prompt,
        targetRole: guidedDraft.targetRole,
        sectionScope: guidedDraft.sectionScope,
        answers: guidedAnswers,
      });

      if (activeAnalysisItemId) {
        await dismissQueueItem({ actionId: activeAnalysisItemId }).catch(() => null);
      }

      setCustomPrompt("");
      resetGuidedFlow();
      scrollToQueueSection();
    } catch (error) {
      setGuidedError(
        error instanceof Error ? error.message : "Failed to enqueue guided apply action.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handlePreviewQueueResult = (item: AiQueueItem) => {
    if (
      !isResumeResult(item.result) ||
      !item.result.resumeData ||
      item.sourceSnapshot.type !== "resume"
    ) {
      return;
    }

    if (proposal.source === "ai_queue" && proposal.sourceActionId === item._id) {
      openProposalPreview();
      return;
    }

    setProposalDraft({
      source: "ai_queue",
      sourceActionId: item._id,
      baseSnapshot: item.sourceSnapshot.resumeData,
      proposalSnapshot: item.result.resumeData,
      baseHash: item.result.baseHash,
      createdAt: item.finishedAt,
      message:
        proposal.status === "stale"
          ? "This AI draft is stale because the resume changed again. Preview it or discard it, then rerun the action."
          : "Review this AI draft in the preview before applying it.",
      openPreview: true,
    });
  };

  const handleDismissQueueItem = async (actionId: Id<"aiActions">) => {
    setDismissingItemId(actionId);
    setQueueError(null);

    try {
      await dismissQueueItem({ actionId });
      if (proposal.source === "ai_queue" && proposal.sourceActionId === actionId) {
        discardProposalDraft();
      }
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Failed to dismiss queue item.");
    } finally {
      setDismissingItemId(null);
    }
  };

  const updateGuidedAnswer = (id: string, value: string) => {
    setGuidedAnswers((current) =>
      current.map((answer) => (answer.id === id ? { ...answer, answer: value } : answer)),
    );
  };

  if (isTailoredResume && !application) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-foreground/70">
        This tailored resume has no linked application context yet.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sky-50 via-background to-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/60">{contextLabel}</p>
              <h3 className="text-base font-semibold">{contextTitle}</h3>
              <p className="mt-1 text-xs text-foreground/60">{contextDescription}</p>
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
              {contextBadge}
            </div>
          </div>

          {isTailoredResume && application?.categories && application.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {application.categories.slice(0, 8).map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[11px] text-foreground/80"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>

        <div ref={queueSectionRef} className="rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">Queue</h4>
              <p className="text-xs text-foreground/60">{queueDescription}</p>
            </div>
            {liveQueueItem && (
              <div className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
                1 live job
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {queueItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-secondary/20 px-3 py-3 text-xs text-foreground/60">
                No active or pending AI jobs for this resume.
              </div>
            ) : (
              queueItems.map((item) => (
                <div key={item._id} className="rounded-xl border bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold">{item.displayTitle}</div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getQueueStatusBadge(
                            item.status,
                          )}`}
                        >
                          {formatQueueStatus(item.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-foreground/70">{getStageLabel(item)}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-foreground/55">
                        <span>Queued: {formatTimestamp(item.createdAt) ?? "n/a"}</span>
                        {item.startedAt && <span>Started: {formatTimestamp(item.startedAt)}</span>}
                        {item.finishedAt && (
                          <span>Updated: {formatTimestamp(item.finishedAt)}</span>
                        )}
                        {(item.status === "queued" || item.status === "running") && (
                          <span>
                            Elapsed:{" "}
                            {formatDuration(
                              currentTime -
                                (item.status === "running"
                                  ? (item.startedAt ?? item.createdAt)
                                  : item.createdAt),
                            )}
                          </span>
                        )}
                      </div>
                      {item.error?.message && (
                        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                          {item.error.message}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.status === "action_required" && isAnalysisResult(item.result) && (
                        <Button size="sm" onClick={() => handleContinueFromAnalysis(item)}>
                          Continue
                        </Button>
                      )}

                      {item.status === "action_required" &&
                        isResumeResult(item.result) &&
                        item.result.requiresReview &&
                        item.result.resumeData && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handlePreviewQueueResult(item)}
                              disabled={dismissingItemId === item._id}
                            >
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismissQueueItem(item._id as Id<"aiActions">)}
                              disabled={dismissingItemId === item._id}
                            >
                              Discard
                            </Button>
                          </>
                        )}

                      {item.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismissQueueItem(item._id as Id<"aiActions">)}
                          disabled={dismissingItemId === item._id}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <Label
            htmlFor="target-role"
            className="text-xs uppercase tracking-wide text-foreground/60"
          >
            Target Role
          </Label>
          <div className="mt-2 space-y-2">
            <Select
              value={targetRolePreset}
              onValueChange={(value) => {
                setHasEditedTargetRole(true);
                setTargetRolePreset(value);
              }}
              disabled={!canQueueAction}
            >
              <SelectTrigger id="target-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {targetRolePreset === "custom" && (
              <Input
                value={customRole}
                onChange={(event) => {
                  setHasEditedTargetRole(true);
                  setCustomRole(event.target.value);
                }}
                placeholder="Type a custom role, e.g. Enterprise Sales"
                disabled={!canQueueAction}
              />
            )}
            {preferredTargetRole && !hasEditedTargetRole && (
              <p className="text-xs text-foreground/60">
                Prefilled from profile context: {preferredTargetRole}
              </p>
            )}
          </div>
        </div>

        {profileContext && (
          <div className="rounded-xl border bg-secondary/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Using Profile Context</div>
                <p className="mt-1 text-xs text-foreground/60">{profileContextSummary}</p>
              </div>
              <Link href="/dashboard/profile" className="shrink-0">
                <Button size="sm" variant="outline">
                  Edit Profile
                </Button>
              </Link>
            </div>
            {profileContext.derived.topSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profileContext.derived.topSkills.slice(0, 6).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-foreground/80"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {missingSignals.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Missing profile signals: {missingSignals.slice(0, 2).join(" ")}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Quick Actions</h4>
              <p className="text-xs text-foreground/60">
                Quick Run now enqueues server-side. Guided uses analysis plus follow-up questions.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!canQueueAction}
              onClick={() => openGuidedRun({ targetRole: resolvedTargetRole })}
            >
              <Sparkle className="mr-1 h-4 w-4" />
              Guided Run
            </Button>
          </div>

          <div className="grid gap-2">
            {quickPresets.map((preset) => (
              <div key={preset.id} className="rounded-xl border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{preset.title}</div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getImpactBadge(
                          preset.impact,
                        )}`}
                      >
                        {preset.impact}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/70">{preset.description}</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {preset.guidedEnabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canQueueAction}
                        onClick={() =>
                          openGuidedRun({
                            presetId: preset.id as GuidedPresetId,
                            targetRole: resolvedTargetRole,
                          })
                        }
                      >
                        <Sparkle className="mr-1 h-4 w-4" />
                        Guided
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={!canQueueAction}
                      onClick={() => void handleQuickRun(preset.id)}
                    >
                      {preset.impact === "high" ? (
                        <Sparkle className="mr-1 h-4 w-4" />
                      ) : (
                        <PencilSimple className="mr-1 h-4 w-4" />
                      )}
                      Quick Run
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Guided Run from Prompt
          </div>
          <Textarea
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            placeholder="Describe the change you want, then continue into the guided flow."
            rows={4}
            disabled={!canQueueAction}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-foreground/60">{promptDescription}</p>
            <Button
              size="sm"
              variant="outline"
              disabled={!canQueueAction}
              onClick={handleOpenGuidedFromPrompt}
            >
              <Sparkle className="mr-1 h-4 w-4" />
              Open Guided Run
            </Button>
          </div>
        </div>

        {!isLocked ? (
          <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-xs text-foreground/70">
            Every AI result becomes a review draft first. If the resume changes before or after the
            draft arrives, Apply is disabled and the action must be rerun.
          </div>
        ) : (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            This resume is locked. Unlock it to run AI actions.
          </div>
        )}

        {queueError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {queueError}
          </div>
        )}
      </div>

      <Dialog open={guidedOpen} onOpenChange={setGuidedOpen}>
        <DialogContent className="left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-[min(90vh,860px)] sm:w-[min(960px,92vw)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sm sm:border">
          <DialogHeader className="border-b px-6 pb-4 pt-6">
            <DialogTitle>Guided AI Run</DialogTitle>
            <DialogDescription>
              Build the request, queue the analysis, answer follow-up questions, and enqueue the
              final guided apply when you are ready.
            </DialogDescription>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {GUIDED_STEP_ORDER.map((step, index) => {
                const isDone = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div
                    key={step.id}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      isCurrent
                        ? "border-sky-300 bg-sky-50 text-sky-900"
                        : isDone
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-border bg-background text-foreground/60"
                    }`}
                  >
                    <div className="font-semibold">{step.label}</div>
                    <div className="mt-1">
                      {isDone ? "Done" : isCurrent ? "Current" : "Pending"}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.5fr_0.9fr]">
            <ScrollArea className="min-h-0">
              <div className="space-y-4 p-6">
                {guidedStep === "intent" && (
                  <>
                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-semibold">Starting Point</div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {AI_ACTION_PRESETS.filter((preset) => preset.guidedEnabled).map(
                          (preset) => {
                            const selected = guidedDraft.presetId === preset.id;

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                  selected
                                    ? "border-sky-300 bg-sky-50"
                                    : "border-border bg-background hover:bg-secondary/20"
                                }`}
                                onClick={() =>
                                  setGuidedDraft((current) => ({
                                    ...current,
                                    presetId: preset.id as GuidedPresetId,
                                  }))
                                }
                              >
                                <div className="text-sm font-semibold">{preset.title}</div>
                                <div className="mt-1 text-xs text-foreground/70">
                                  {preset.description}
                                </div>
                              </button>
                            );
                          },
                        )}
                        <button
                          type="button"
                          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                            guidedDraft.presetId === null
                              ? "border-sky-300 bg-sky-50"
                              : "border-border bg-background hover:bg-secondary/20"
                          }`}
                          onClick={() =>
                            setGuidedDraft((current) => ({
                              ...current,
                              presetId: null,
                            }))
                          }
                        >
                          <div className="text-sm font-semibold">Custom Prompt</div>
                          <div className="mt-1 text-xs text-foreground/70">
                            Start from a blank prompt and let the guided flow ask for missing
                            detail.
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <Label htmlFor="guided-prompt" className="text-sm font-semibold">
                        Change Request
                      </Label>
                      <Textarea
                        id="guided-prompt"
                        value={guidedDraft.prompt}
                        onChange={(event) =>
                          setGuidedDraft((current) => ({ ...current, prompt: event.target.value }))
                        }
                        rows={6}
                        placeholder={
                          guidedDraft.presetId
                            ? "Add any extra direction or constraints for this preset."
                            : "Describe what you want the AI to change."
                        }
                        className="mt-3"
                      />
                      <p className="mt-2 text-xs text-foreground/60">
                        {guidedDraft.presetId
                          ? "Optional extra guidance. The preset instruction will also be included."
                          : "Required when no preset is selected."}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="guided-target-role" className="text-sm font-semibold">
                            Target Role
                          </Label>
                          <Input
                            id="guided-target-role"
                            value={guidedDraft.targetRole}
                            onChange={(event) =>
                              setGuidedDraft((current) => ({
                                ...current,
                                targetRole: event.target.value,
                              }))
                            }
                            placeholder="Optional unless the chosen preset needs it"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="guided-scope" className="text-sm font-semibold">
                            Focus Scope
                          </Label>
                          <Select
                            value={guidedDraft.sectionScope}
                            onValueChange={(value) =>
                              setGuidedDraft((current) => ({
                                ...current,
                                sectionScope: value as GuidedRunDraft["sectionScope"],
                              }))
                            }
                          >
                            <SelectTrigger id="guided-scope">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SECTION_SCOPE_OPTIONS.map((scope) => (
                                <SelectItem key={scope.id} value={scope.id}>
                                  {scope.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border bg-secondary/20 px-3 py-2 text-xs text-foreground/70">
                        {guidedScope.description}
                      </div>
                    </div>

                    {guidedError && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        {guidedError}
                      </div>
                    )}
                  </>
                )}

                {guidedStep === "clarify" && (
                  <>
                    <div className="rounded-xl border bg-secondary/20 p-4 text-sm text-foreground/70">
                      Answer each question or explicitly skip it. These answers stay local until you
                      enqueue the guided apply step.
                    </div>

                    <div className="space-y-3">
                      {guidedAnswers.map((answer, index) => (
                        <div key={answer.id} className="rounded-xl border p-4">
                          <div className="text-xs uppercase tracking-wide text-foreground/50">
                            Question {index + 1}
                          </div>
                          <div className="mt-1 text-sm font-semibold">{answer.question}</div>
                          <div className="mt-3 rounded-lg border bg-secondary/20 px-3 py-2 text-xs text-foreground/70">
                            {answer.reasoning}
                          </div>
                          <Textarea
                            value={answer.answer}
                            onChange={(event) => updateGuidedAnswer(answer.id, event.target.value)}
                            rows={4}
                            className="mt-3"
                            placeholder="Add the clarification the AI should use."
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateGuidedAnswer(answer.id, GUIDED_SKIP_ANSWER)}
                            >
                              Skip Question
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {guidedStep === "review" && (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-foreground/50">
                          Mode
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {guidedPreset ? guidedPreset.title : "Custom Prompt"}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-foreground/50">
                          Target Role
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {guidedDraft.targetRole.trim() || "Not specified"}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-foreground/50">
                          Scope
                        </div>
                        <div className="mt-1 text-sm font-semibold">{guidedScope.label}</div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-semibold">Final Instruction</div>
                      <Textarea
                        value={guidedInstructionPreview}
                        readOnly
                        rows={14}
                        className="mt-3 text-xs"
                      />
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Enqueueing this step creates a server-side draft job. The result will always
                      wait for explicit review in the resume preview before it can be applied.
                    </div>

                    {guidedError && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        {guidedError}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            <aside className="border-l bg-secondary/10 p-6">
              <div className="space-y-4">
                <div className="rounded-xl border bg-background p-4">
                  <div className="text-xs uppercase tracking-wide text-foreground/50">
                    {isTailoredResume ? "Application" : "Resume"}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{contextTitle}</div>
                  <div className="mt-2 text-xs text-foreground/60">
                    {isTailoredResume
                      ? application?.categories && application.categories.length > 0
                        ? application.categories.join(", ")
                        : "No categories"
                      : "No linked job context"}
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <div className="text-xs uppercase tracking-wide text-foreground/50">
                    Current Request
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {guidedPreset ? guidedPreset.title : "Custom Prompt"}
                  </div>
                  <div className="mt-2 text-xs text-foreground/70">
                    {guidedDraft.prompt.trim() || "No extra prompt added yet."}
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <div className="text-xs uppercase tracking-wide text-foreground/50">
                    Clarifications
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {guidedAnswers.length === 0
                      ? "No questions yet"
                      : `${guidedAnswers.filter((answer) => answer.answer.trim().length > 0).length}/${guidedAnswers.length} answered`}
                  </div>
                </div>

                {profileContext && (
                  <div className="rounded-xl border bg-background p-4">
                    <div className="text-xs uppercase tracking-wide text-foreground/50">
                      Career Profile
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {profileContext.derived.primaryTargetRole ||
                        profileContext.profile.currentTitle ||
                        profileContext.profile.headline ||
                        "Loaded"}
                    </div>
                    <div className="mt-2 text-xs text-foreground/60">
                      {profileContext.derived.topSkills.slice(0, 6).join(", ") ||
                        "Using saved profile context"}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-xs text-foreground/60">
              {guidedStep === "intent" && "Step 1 of 4"}
              {guidedStep === "analyze" && "Step 2 of 4"}
              {guidedStep === "clarify" && "Step 3 of 4"}
              {guidedStep === "review" && "Step 4 of 4"}
            </div>

            <div className="flex gap-2">
              {guidedStep !== "intent" && guidedStep !== "analyze" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setGuidedStep(
                      guidedStep === "review" && guidedAnswers.length > 0 ? "clarify" : "intent",
                    )
                  }
                >
                  Back
                </Button>
              )}

              {guidedStep === "intent" && (
                <Button
                  onClick={() => void handleAnalyzeGuidedRun()}
                  disabled={!canAdvanceGuided || !canQueueAction}
                >
                  <Sparkle className="mr-1 h-4 w-4" />
                  Queue Analysis
                </Button>
              )}

              {guidedStep === "clarify" && (
                <Button onClick={() => setGuidedStep("review")} disabled={!canContinueClarify}>
                  Review Instruction
                </Button>
              )}

              {guidedStep === "review" && (
                <Button onClick={() => void handleApplyGuidedRun()} disabled={!canQueueAction}>
                  <Sparkle className="mr-1 h-4 w-4" />
                  Queue Guided Apply
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
