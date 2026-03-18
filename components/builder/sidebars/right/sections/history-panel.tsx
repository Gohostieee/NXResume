"use client";

import { useState } from "react";
import { GitBranch, Eye, Target, PencilSimple } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useResumeStore } from "@/stores/resume";
import { useAutoSaveStore } from "@/stores/auto-save";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatCommitTime = (value: number) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const badgeStyles: Record<"manual" | "ai" | "system", string> = {
  manual: "border-slate-200 bg-slate-100 text-slate-900",
  ai: "border-emerald-200 bg-emerald-100 text-emerald-900",
  system: "border-amber-200 bg-amber-100 text-amber-900",
};

type BranchDialogState =
  | { mode: "closed"; commitId: null; name: string }
  | { mode: "create"; commitId: string; name: string }
  | { mode: "rename"; commitId: null; name: string };

export function HistoryPanel() {
  const resume = useResumeStore((state) => state.resume);
  const activeBranch = useResumeStore((state) => state.activeBranch);
  const branches = useResumeStore((state) => state.branches);
  const commits = useResumeStore((state) => state.commits);
  const checkedOutCommitId = useResumeStore((state) => state.checkedOutCommitId);
  const checkoutCommit = useResumeStore((state) => state.checkoutCommit);
  const exitCommitPreview = useResumeStore((state) => state.exitCommitPreview);

  const flushCommit = useAutoSaveStore((state) => state.flushCommit);
  const switchBranch = useMutation(api.resumes.switchBranch);
  const createBranchFromCommit = useMutation(api.resumes.createBranchFromCommit);
  const renameBranch = useMutation(api.resumes.renameBranch);
  const setDefaultBranch = useMutation(api.resumes.setDefaultBranch);

  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [branchDialog, setBranchDialog] = useState<BranchDialogState>({
    mode: "closed",
    commitId: null,
    name: "",
  });

  if (!resume?.id || !activeBranch) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-foreground/70">
        Resume history will appear once the versioned branch state is ready.
      </div>
    );
  }

  const handleSwitchBranch = async (branchId: string) => {
    if (branchId === activeBranch._id) return;
    setIsSubmitting(`switch:${branchId}`);
    try {
      await flushCommit();
      await switchBranch({
        resumeId: resume.id as Id<"resumes">,
        branchId: branchId as Id<"resumeBranches">,
      });
      exitCommitPreview();
    } finally {
      setIsSubmitting(null);
    }
  };

  const openCreateBranchDialog = (commitId: string) => {
    setBranchDialog({ mode: "create", commitId, name: "branch" });
  };

  const openRenameBranchDialog = () => {
    setBranchDialog({ mode: "rename", commitId: null, name: activeBranch.name });
  };

  const closeBranchDialog = () => {
    if (isSubmitting !== null) return;
    setBranchDialog({ mode: "closed", commitId: null, name: "" });
  };

  const submitBranchDialog = async () => {
    const name = branchDialog.name.trim();
    if (!name) return;

    if (branchDialog.mode === "create" && branchDialog.commitId) {
      setIsSubmitting(`branch:${branchDialog.commitId}`);
      try {
        await flushCommit();
        await createBranchFromCommit({
          resumeId: resume.id as Id<"resumes">,
          commitId: branchDialog.commitId as Id<"resumeCommits">,
          sourceBranchId: activeBranch._id as Id<"resumeBranches">,
          name,
        });
        exitCommitPreview();
        setBranchDialog({ mode: "closed", commitId: null, name: "" });
      } finally {
        setIsSubmitting(null);
      }
    }

    if (branchDialog.mode === "rename") {
      if (name === activeBranch.name) {
        closeBranchDialog();
        return;
      }

      setIsSubmitting(`rename:${activeBranch._id}`);
      try {
        await renameBranch({
          resumeId: resume.id as Id<"resumes">,
          branchId: activeBranch._id as Id<"resumeBranches">,
          name,
        });
        setBranchDialog({ mode: "closed", commitId: null, name: "" });
      } finally {
        setIsSubmitting(null);
      }
    }
  };

  const handleSetDefaultBranch = async () => {
    if (activeBranch.isDefault) return;
    setIsSubmitting(`default:${activeBranch._id}`);
    try {
      await flushCommit();
      await setDefaultBranch({
        resumeId: resume.id as Id<"resumes">,
        branchId: activeBranch._id as Id<"resumeBranches">,
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="h-4 w-4" />
          Branches
        </div>

        <div className="mt-3 grid gap-3">
          <div className="grid gap-2">
            <Select value={activeBranch._id} onValueChange={(value) => void handleSwitchBranch(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}{branch.isDefault ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
              <Button
              size="sm"
              variant="outline"
              onClick={openRenameBranchDialog}
              disabled={isSubmitting !== null}
            >
              <PencilSimple className="mr-1 h-4 w-4" />
              Rename
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSetDefaultBranch}
              disabled={activeBranch.isDefault || isSubmitting !== null}
            >
              <Target className="mr-1 h-4 w-4" />
              Set Default
            </Button>
          </div>

          <div className="rounded-lg border bg-secondary/20 px-3 py-2 text-xs text-foreground/70">
            Public pages, raw JSON, PDF export, and other external consumers resolve from the
            default branch head commit.
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Commit History</div>
            <div className="text-xs text-foreground/60">
              Preview a commit, then branch from it if you want a divergent version.
            </div>
          </div>
          {checkedOutCommitId && (
            <Button size="sm" variant="outline" onClick={exitCommitPreview}>
              Return to Branch Head
            </Button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {commits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-secondary/20 px-3 py-3 text-xs text-foreground/60">
              No commits yet on this branch.
            </div>
          ) : (
            commits.map((commit) => {
              const isCheckedOut = checkedOutCommitId === commit._id;
              const isHead = activeBranch.headCommitId === commit._id;

              return (
                <div
                  key={commit._id}
                  className={`rounded-xl border p-3 ${isCheckedOut ? "border-sky-300 bg-sky-50" : "bg-background"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeStyles[commit.changeKind]}`}>
                          {commit.changeKind}
                        </span>
                        {isHead && (
                          <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
                            head
                          </span>
                        )}
                        <span className="text-xs text-foreground/50">{formatCommitTime(commit.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-sm font-semibold">{commit.message}</div>
                      <div className="mt-1 text-xs text-foreground/60">{commit.summary}</div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkoutCommit(isCheckedOut ? null : commit._id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        {isCheckedOut ? "Hide" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreateBranchDialog(commit._id)}
                        disabled={isSubmitting !== null}
                      >
                        Branch Here
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={branchDialog.mode !== "closed"} onOpenChange={(open) => !open && closeBranchDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {branchDialog.mode === "rename" ? "Rename Branch" : "Create Branch"}
            </DialogTitle>
            <DialogDescription>
              {branchDialog.mode === "rename"
                ? "Update the current branch name."
                : "Create a new branch starting from the selected commit."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              value={branchDialog.name}
              disabled={isSubmitting !== null}
              onChange={(event) =>
                setBranchDialog((current) => ({ ...current, name: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitBranchDialog();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeBranchDialog} disabled={isSubmitting !== null}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitBranchDialog()}
              disabled={branchDialog.name.trim().length === 0 || isSubmitting !== null}
            >
              {branchDialog.mode === "rename" ? "Save" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
