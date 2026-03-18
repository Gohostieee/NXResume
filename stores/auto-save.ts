import { create } from "zustand";
import { useResumeStore } from "./resume";
import type { Id } from "@/convex/_generated/dataModel";

type SaveDraftArgs = {
  resumeId: Id<"resumes">;
  branchId?: Id<"resumeBranches">;
  snapshot: {
    title: string;
    visibility: "public" | "private";
    data: any;
  };
  changedPaths: string[];
  changeSource: string;
};

type CommitDraftArgs = {
  resumeId: Id<"resumes">;
  branchId?: Id<"resumeBranches">;
  changeKind?: "manual" | "ai" | "system";
  changeSource?: string;
  changedPaths?: string[];
  message?: string;
  summary?: string;
};

type AutoSaveStore = {
  isSaving: boolean;
  isCommitting: boolean;
  lastSaved: string;
  lastCommitted: string;
  saveFunction: ((args: SaveDraftArgs) => Promise<any>) | null;
  commitFunction: ((args: CommitDraftArgs) => Promise<any>) | null;

  setSaveFunction: (fn: (args: SaveDraftArgs) => Promise<any>) => void;
  setCommitFunction: (fn: (args: CommitDraftArgs) => Promise<any>) => void;
  setLastSaved: (data: string) => void;
  saveDraft: () => Promise<void>;
  flushCommit: (args?: Omit<CommitDraftArgs, "resumeId" | "branchId">) => Promise<void>;
};

type ResumeSnapshotInput = {
  title?: string;
  visibility?: string;
  data?: unknown;
};

export const getResumeSnapshot = (resume: ResumeSnapshotInput) =>
  JSON.stringify({
    data: resume.data ?? null,
    title: resume.title ?? "",
    visibility: resume.visibility ?? "",
  });

const getCurrentStoreSnapshot = () => {
  const state = useResumeStore.getState();
  const workingSnapshot = state.workingSnapshot;

  return {
    resumeId: (state.resume?.id || state.resume?._id || "") as Id<"resumes">,
    branchId: state.activeBranch?._id as Id<"resumeBranches"> | undefined,
    snapshot: workingSnapshot,
    snapshotKey: workingSnapshot ? getResumeSnapshot(workingSnapshot) : "",
    changedPaths: state.pendingChangedPaths,
    changeSource: state.pendingChangeSource ?? "builder_manual",
  };
};

export const useAutoSaveStore = create<AutoSaveStore>((set, get) => ({
  isSaving: false,
  isCommitting: false,
  lastSaved: "",
  lastCommitted: "",
  saveFunction: null,
  commitFunction: null,

  setSaveFunction: (fn) => set({ saveFunction: fn }),
  setCommitFunction: (fn) => set({ commitFunction: fn }),
  setLastSaved: (data) => set({ lastSaved: data, lastCommitted: data }),

  saveDraft: async () => {
    const { saveFunction, isSaving, lastSaved } = get();
    if (!saveFunction || isSaving) return;

    const current = getCurrentStoreSnapshot();
    if (!current.resumeId || !current.snapshot) return;
    if (current.snapshotKey === lastSaved && current.changedPaths.length === 0) return;

    set({ isSaving: true });
    try {
      await saveFunction({
        resumeId: current.resumeId,
        branchId: current.branchId,
        snapshot: current.snapshot,
        changedPaths: current.changedPaths,
        changeSource: current.changeSource,
      });
      set({ lastSaved: current.snapshotKey });
    } finally {
      set({ isSaving: false });
    }
  },

  flushCommit: async (args) => {
    const { commitFunction, isCommitting } = get();
    if (!commitFunction || isCommitting) return;

    const current = getCurrentStoreSnapshot();
    if (!current.resumeId || !current.snapshot) return;

    await get().saveDraft();

    set({ isCommitting: true, isSaving: true });
    try {
      await commitFunction({
        resumeId: current.resumeId,
        branchId: current.branchId,
        changeKind: args?.changeKind,
        changeSource: args?.changeSource ?? current.changeSource,
        changedPaths: args?.changedPaths ?? current.changedPaths,
        message: args?.message,
        summary: args?.summary,
      });
      useResumeStore.getState().clearLocalHistory();
      const snapshotKey = getResumeSnapshot(current.snapshot);
      set({
        lastSaved: snapshotKey,
        lastCommitted: snapshotKey,
      });
    } finally {
      set({ isCommitting: false, isSaving: false });
    }
  },
}));

export const useTriggerSave = () => {
  const flushCommit = useAutoSaveStore((state) => state.flushCommit);
  return flushCommit;
};
