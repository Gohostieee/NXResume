"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useResumeStore } from "@/stores/resume";
import { getResumeSnapshot, useAutoSaveStore } from "@/stores/auto-save";

const IDLE_COMMIT_MS = 10_000;
const FORCE_COMMIT_MS = 30_000;
const DRAFT_SAVE_MS = 750;

export function AutoSave() {
  const resumeId = useResumeStore((state) => state.resume?.id || state.resume?._id);
  const activeBranchId = useResumeStore((state) => state.activeBranch?._id);
  const workingSnapshot = useResumeStore((state) => state.workingSnapshot);
  const pendingChangedPaths = useResumeStore((state) => state.pendingChangedPaths);
  const checkedOutCommitId = useResumeStore((state) => state.checkedOutCommitId);

  const saveDraftMutation = useMutation(api.resumes.saveDraft);
  const commitDraftMutation = useMutation(api.resumes.commitDraft);
  const setSaveFunction = useAutoSaveStore((state) => state.setSaveFunction);
  const setCommitFunction = useAutoSaveStore((state) => state.setCommitFunction);
  const saveDraft = useAutoSaveStore((state) => state.saveDraft);
  const flushCommit = useAutoSaveStore((state) => state.flushCommit);
  const setLastSaved = useAutoSaveStore((state) => state.setLastSaved);

  const idleTimerRef = useRef<number | null>(null);
  const forceTimerRef = useRef<number | null>(null);
  const lastInitializedRef = useRef<string | null>(null);

  const snapshotKey = workingSnapshot ? getResumeSnapshot(workingSnapshot) : "";
  const isReadonlyCommitView =
    Boolean(checkedOutCommitId) && checkedOutCommitId !== activeBranchId;

  useEffect(() => {
    setSaveFunction(saveDraftMutation as any);
    setCommitFunction(commitDraftMutation as any);
  }, [commitDraftMutation, saveDraftMutation, setCommitFunction, setSaveFunction]);

  useEffect(() => {
    if (!resumeId || !workingSnapshot) return;
    const branchKey = `${resumeId}:${activeBranchId ?? "legacy"}`;
    if (lastInitializedRef.current === branchKey) return;
    lastInitializedRef.current = branchKey;
    setLastSaved(snapshotKey);
  }, [activeBranchId, resumeId, setLastSaved, snapshotKey, workingSnapshot]);

  useEffect(() => {
    if (!resumeId || !workingSnapshot || pendingChangedPaths.length === 0 || isReadonlyCommitView) {
      return;
    }

    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    if (forceTimerRef.current) window.clearTimeout(forceTimerRef.current);

    const saveTimer = window.setTimeout(() => {
      void saveDraft();
    }, DRAFT_SAVE_MS);

    idleTimerRef.current = window.setTimeout(() => {
      void flushCommit();
    }, IDLE_COMMIT_MS);

    forceTimerRef.current = window.setTimeout(() => {
      void flushCommit();
    }, FORCE_COMMIT_MS);

    return () => {
      window.clearTimeout(saveTimer);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (forceTimerRef.current) window.clearTimeout(forceTimerRef.current);
    };
  }, [
    flushCommit,
    isReadonlyCommitView,
    pendingChangedPaths.length,
    resumeId,
    saveDraft,
    snapshotKey,
    workingSnapshot,
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      void flushCommit();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flushCommit();
    };
  }, [flushCommit]);

  return null;
}
