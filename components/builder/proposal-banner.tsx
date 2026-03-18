"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useResumeStore } from "@/stores/resume";

export const ProposalBanner = () => {
  const resume = useResumeStore((state) => state.resume);
  const activeBranch = useResumeStore((state) => state.activeBranch);
  const proposal = useResumeStore((state) => state.proposal);
  const openProposalPreview = useResumeStore((state) => state.openProposalPreview);
  const closeProposalPreview = useResumeStore((state) => state.closeProposalPreview);
  const markProposalStale = useResumeStore((state) => state.markProposalStale);
  const discardProposalDraft = useResumeStore((state) => state.discardProposalDraft);
  const applyAiProposal = useMutation(api.resumes.applyAiProposal);
  const applyQueueResult = useMutation(api.aiQueue.applyResult);
  const dismissQueueItem = useMutation(api.aiQueue.dismiss);
  const [submitting, setSubmitting] = useState<"apply" | "discard" | null>(null);

  const isIdle = proposal.status === "idle" || !proposal.proposalSnapshot || !proposal.baseSnapshot;
  const isStale = proposal.status === "stale";
  const isPreviewing = proposal.isPreviewOpen;

  const description = useMemo(() => {
    if (proposal.message) {
      return proposal.message;
    }

    if (isStale) {
      return "This AI draft is stale because the resume changed again. Preview it or discard it, then rerun the AI action.";
    }

    if (isPreviewing) {
      return "Review the proposed changes in the preview, then apply or discard them.";
    }

    return "An AI draft is ready. Open the preview to review it before saving.";
  }, [isPreviewing, isStale, proposal.message]);

  if (isIdle) {
    return null;
  }

  const handleApply = async () => {
    if (!proposal.proposalSnapshot || isStale || !resume.id || !activeBranch?._id) {
      return;
    }

    setSubmitting("apply");

    try {
      if (proposal.source === "ai_queue" && proposal.sourceActionId) {
        await applyQueueResult({ actionId: proposal.sourceActionId as Id<"aiActions"> });
      } else {
        await applyAiProposal({
          resumeId: resume.id as Id<"resumes">,
          branchId: activeBranch._id as Id<"resumeBranches">,
          baseHash: proposal.baseHash ?? "",
          proposalSnapshot: {
            title: resume.title,
            visibility: resume.visibility,
            data: proposal.proposalSnapshot,
          },
          changeSource: proposal.source ?? "ai_editor",
          message: "Applied AI changes",
          summary: "Applied AI changes",
        });
      }

      discardProposalDraft();

      toast({
        variant: "success",
        title: "Changes applied",
        description: "The proposed resume draft was saved.",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Resume changed since this AI draft")) {
        markProposalStale();
      }

      toast({
        variant: "error",
        title: "Apply failed",
        description: error instanceof Error ? error.message : "Could not apply the draft.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleDiscard = async () => {
    setSubmitting("discard");

    try {
      if (proposal.source === "ai_queue" && proposal.sourceActionId) {
        await dismissQueueItem({ actionId: proposal.sourceActionId as Id<"aiActions"> });
      }

      discardProposalDraft();
      toast({
        variant: "info",
        title: "Draft discarded",
        description: "The proposed resume draft was removed.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Discard failed",
        description: error instanceof Error ? error.message : "Could not discard the draft.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="border-b border-emerald-200 bg-emerald-50/80 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-950">Proposed Resume Draft</p>
          <p className="text-xs text-emerald-900/80">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPreviewing ? (
            <Button size="sm" variant="outline" onClick={closeProposalPreview}>
              Hide Preview
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={openProposalPreview}>
              Preview
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => void handleApply()}
            disabled={isStale || submitting !== null}
          >
            Apply
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleDiscard()}
            disabled={submitting !== null}
          >
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
};
