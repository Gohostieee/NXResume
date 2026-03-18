import { createId } from "@paralleldrive/cuid2";
import {
  createEmptyResumeProposalState,
  hashResumeData,
  type ResumeProposalDraftPayload,
  type ResumeProposalState,
} from "@/lib/resume/proposal";
import type { CustomSectionGroup, ResumeData, SectionKey } from "@/lib/schema";
import { defaultSection } from "@/lib/schema";
import { removeItemInLayout } from "@/lib/utils";
import _set from "lodash.set";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ResumeSnapshot = {
  title: string;
  visibility: "public" | "private";
  data: ResumeData;
};

type ResumeRoot = {
  id: string;
  _id?: string;
  slug: string;
  locked: boolean;
  scope?: "regular" | "application_tailored";
  applicationId?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  defaultBranchId?: string;
  activeBranchId?: string;
};

export type Resume = ResumeRoot & ResumeSnapshot;

export type ResumeBranch = {
  _id: string;
  resumeId: string;
  name: string;
  headCommitId?: string;
  baseCommitId?: string;
  createdFromBranchId?: string;
  isDefault: boolean;
  draftSnapshot: ResumeSnapshot;
  draftHeadCommitId?: string;
  draftChangedPaths: string[];
  draftChangeSource?: string;
  draftSessionStartedAt?: number;
  draftUpdatedAt: number;
  createdAt: number;
  updatedAt: number;
};

export type ResumeCommit = {
  _id: string;
  resumeId: string;
  branchId: string;
  parentCommitId?: string;
  snapshot: ResumeSnapshot;
  changeKind: "manual" | "ai" | "system";
  changeSource: string;
  message: string;
  summary: string;
  authorId?: string;
  createdAt: number;
  updatedAt: number;
};

type BuilderStatePayload = {
  historyReady: boolean;
  resume: Resume;
  activeBranch: ResumeBranch | null;
  branches: ResumeBranch[];
  commits: ResumeCommit[];
  workingSnapshot: ResumeSnapshot;
};

type ResumeStore = {
  resume: Resume;
  proposal: ResumeProposalState;
  historyReady: boolean;
  activeBranch: ResumeBranch | null;
  branches: ResumeBranch[];
  commits: ResumeCommit[];
  workingSnapshot: ResumeSnapshot | null;
  checkedOutCommitId: string | null;
  undoStack: ResumeSnapshot[];
  redoStack: ResumeSnapshot[];
  pendingChangedPaths: string[];
  pendingChangeSource: string | null;

  setBuilderState: (payload: BuilderStatePayload) => void;
  setResume: (resume: Resume) => void;
  setResumeData: (data: ResumeData, source?: string) => void;
  setValue: (path: string, value: unknown, source?: string) => void;
  setProposalDraft: (payload: ResumeProposalDraftPayload & { baseBranchId?: string; baseSnapshotHash?: string }) => void;
  openProposalPreview: () => void;
  closeProposalPreview: () => void;
  markProposalStale: () => void;
  discardProposalDraft: () => void;
  addSection: () => void;
  removeSection: (sectionId: SectionKey) => void;
  checkoutCommit: (commitId: string | null) => void;
  exitCommitPreview: () => void;
  clearLocalHistory: () => void;
  undo: () => void;
  redo: () => void;

  collapsedSections: Record<string, boolean | undefined>;
  toggleCollapseSection: (id: string) => void;
  expandAllSections: () => void;
  collapseAllSections: () => void;
};

const cloneSnapshot = (snapshot: ResumeSnapshot): ResumeSnapshot => {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as ResumeSnapshot;

  if (cloned.data?.sections && !cloned.data.sections.custom) {
    cloned.data.sections.custom = {};
  }

  return cloned;
};

const snapshotHash = (snapshot: ResumeSnapshot | null | undefined) => JSON.stringify(snapshot ?? null);

const getCustomSections = (resumeData: ResumeData | null | undefined) =>
  resumeData?.sections?.custom ?? {};

const emptySnapshot = (): ResumeSnapshot => ({
  title: "",
  visibility: "private",
  data: {} as ResumeData,
});

const mergeResume = (resume: ResumeRoot, snapshot: ResumeSnapshot): Resume => ({
  ...resume,
  ...snapshot,
});

const LOCAL_UNDO_LIMIT = 50;

const makeResumeRoot = (resume: Resume): ResumeRoot => ({
  id: resume.id || resume._id || "",
  _id: resume._id,
  slug: resume.slug,
  locked: resume.locked,
  scope: resume.scope,
  applicationId: resume.applicationId,
  userId: resume.userId,
  createdAt: resume.createdAt,
  updatedAt: resume.updatedAt,
  defaultBranchId: resume.defaultBranchId,
  activeBranchId: resume.activeBranchId,
});

const pushUndoState = (stack: ResumeSnapshot[], snapshot: ResumeSnapshot) =>
  [...stack, cloneSnapshot(snapshot)].slice(-LOCAL_UNDO_LIMIT);

export const useResumeStore = create<ResumeStore>()(
  immer((set, get) => ({
    resume: {
      id: "",
      slug: "",
      title: "",
      visibility: "private",
      data: {} as ResumeData,
      locked: false,
      userId: "",
      createdAt: 0,
      updatedAt: 0,
    },
    proposal: createEmptyResumeProposalState(),
    historyReady: false,
    activeBranch: null,
    branches: [],
    commits: [],
    workingSnapshot: null,
    checkedOutCommitId: null,
    undoStack: [],
    redoStack: [],
    pendingChangedPaths: [],
    pendingChangeSource: null,

    setBuilderState: ({ historyReady, resume, activeBranch, branches, commits, workingSnapshot }) => {
      set((state) => {
        const root = makeResumeRoot(resume);
        const incomingHash = snapshotHash(workingSnapshot);
        const currentHash = snapshotHash(state.workingSnapshot);
        const shouldReplaceWorking = currentHash !== incomingHash;

        state.historyReady = historyReady;
        state.activeBranch = activeBranch;
        state.branches = branches;
        state.commits = commits;

        if (shouldReplaceWorking || !state.workingSnapshot) {
          state.workingSnapshot = cloneSnapshot(workingSnapshot);
          state.undoStack = [];
          state.redoStack = [];
          state.pendingChangedPaths = [];
          state.pendingChangeSource = null;
        }

        const checkedOutCommit =
          state.checkedOutCommitId
            ? commits.find((commit) => commit._id === state.checkedOutCommitId) ?? null
            : null;

        const visibleSnapshot = checkedOutCommit
          ? cloneSnapshot(checkedOutCommit.snapshot)
          : cloneSnapshot(state.workingSnapshot ?? workingSnapshot);

        state.resume = mergeResume(root, visibleSnapshot);

        if (state.checkedOutCommitId && !checkedOutCommit) {
          state.checkedOutCommitId = null;
          state.resume = mergeResume(root, cloneSnapshot(state.workingSnapshot ?? workingSnapshot));
        }

        if (
          state.proposal.status !== "idle" &&
          state.proposal.baseHash &&
          hashResumeData((state.workingSnapshot ?? workingSnapshot).data) !== state.proposal.baseHash
        ) {
          state.proposal.status = "stale";
          state.proposal.isPreviewOpen = false;
        }
      });
    },

    setResume: (resume) => {
      get().setBuilderState({
        historyReady: false,
        resume,
        activeBranch: null,
        branches: [],
        commits: [],
        workingSnapshot: {
          title: resume.title,
          visibility: resume.visibility,
          data: resume.data,
        },
      });
    },

    setResumeData: (data, source = "builder_manual") => {
      const snapshot = get().workingSnapshot ?? emptySnapshot();
      get().setValue("data", data, source);
      if (snapshot.data === data) return;
    },

    setValue: (path, value, source = "builder_manual") => {
      set((state) => {
        const isReadonly =
          Boolean(state.checkedOutCommitId) &&
          state.checkedOutCommitId !== state.activeBranch?.headCommitId;
        if (isReadonly || !state.workingSnapshot) {
          return;
        }

        const previous = cloneSnapshot(state.workingSnapshot);
        const next = cloneSnapshot(state.workingSnapshot);

        if (path === "visibility") {
          next.visibility = value as "public" | "private";
        } else if (path === "title") {
          next.title = value as string;
        } else if (path === "data") {
          next.data = value as ResumeData;
        } else {
          next.data = _set(next.data, path, value);
        }

        if (snapshotHash(previous) === snapshotHash(next)) {
          return;
        }

        state.undoStack = pushUndoState(state.undoStack, previous);
        state.redoStack = [];
        state.pendingChangedPaths = [...new Set([...state.pendingChangedPaths, path])];
        state.pendingChangeSource = source;
        state.workingSnapshot = next;
        state.resume = mergeResume(makeResumeRoot(state.resume), cloneSnapshot(next));

        if (state.proposal.status !== "idle" && state.proposal.baseHash) {
          const currentHash = hashResumeData(next.data);
          if (currentHash !== state.proposal.baseHash) {
            state.proposal.status = "stale";
            state.proposal.isPreviewOpen = false;
          }
        }
      });
    },

    setProposalDraft: (payload) => {
      set((state) => {
        const baseHash = payload.baseHash ?? hashResumeData(payload.baseSnapshot);
        const openPreview = Boolean(payload.openPreview);

        state.proposal = {
          status: openPreview ? "previewing" : "ready",
          source: payload.source,
          baseSnapshot: payload.baseSnapshot,
          proposalSnapshot: payload.proposalSnapshot,
          baseHash,
          createdAt: payload.createdAt ?? Date.now(),
          sourceActionId: payload.sourceActionId,
          message: payload.message,
          isPreviewOpen: openPreview,
        };
      });
    },

    openProposalPreview: () => {
      set((state) => {
        if (state.proposal.status === "idle" || !state.proposal.proposalSnapshot) {
          return;
        }

        state.proposal.isPreviewOpen = true;
        if (state.proposal.status === "ready") {
          state.proposal.status = "previewing";
        }
      });
    },

    closeProposalPreview: () => {
      set((state) => {
        if (state.proposal.status === "idle") {
          return;
        }

        state.proposal.isPreviewOpen = false;
        if (state.proposal.status === "previewing") {
          state.proposal.status = "ready";
        }
      });
    },

    markProposalStale: () => {
      set((state) => {
        if (state.proposal.status === "idle") {
          return;
        }

        state.proposal.status = "stale";
        state.proposal.isPreviewOpen = false;
      });
    },

    discardProposalDraft: () => {
      set((state) => {
        state.proposal = createEmptyResumeProposalState();
      });
    },

    addSection: () => {
      const section: CustomSectionGroup = {
        ...defaultSection,
        id: createId(),
        name: "Custom Section",
        items: [],
      };

      const working = get().workingSnapshot;
      if (!working) return;

      const next = cloneSnapshot(working);
      const lastPageIndex = next.data.metadata.layout.length - 1;
      next.data.metadata.layout[lastPageIndex][0].push(`custom.${section.id}`);
      next.data = _set(next.data, `sections.custom.${section.id}`, section);
      get().setValue("data", next.data, "custom_section_add");
    },

    removeSection: (sectionId) => {
      if (!sectionId.startsWith("custom.")) return;
      const id = sectionId.split("custom.")[1];
      const working = get().workingSnapshot;
      if (!working) return;

      const next = cloneSnapshot(working);
      removeItemInLayout(sectionId, next.data.metadata.layout);
      const customSections = getCustomSections(next.data);
      if (!(id in customSections)) return;

      delete customSections[id];
      get().setValue("data", next.data, "custom_section_remove");
    },

    checkoutCommit: (commitId) => {
      set((state) => {
        const commit = commitId ? state.commits.find((entry) => entry._id === commitId) : null;
        const root = makeResumeRoot(state.resume);

        state.checkedOutCommitId = commit?._id ?? null;
        state.resume = mergeResume(
          root,
          cloneSnapshot(commit?.snapshot ?? state.workingSnapshot ?? emptySnapshot()),
        );
      });
    },

    exitCommitPreview: () => {
      set((state) => {
        state.checkedOutCommitId = null;
        state.resume = mergeResume(
          makeResumeRoot(state.resume),
          cloneSnapshot(state.workingSnapshot ?? emptySnapshot()),
        );
      });
    },

    clearLocalHistory: () => {
      set((state) => {
        state.undoStack = [];
        state.redoStack = [];
        state.pendingChangedPaths = [];
        state.pendingChangeSource = null;
      });
    },

    undo: () => {
      set((state) => {
        const isReadonly =
          Boolean(state.checkedOutCommitId) &&
          state.checkedOutCommitId !== state.activeBranch?.headCommitId;
        if (isReadonly || state.undoStack.length === 0 || !state.workingSnapshot) {
          return;
        }

        const previous = state.undoStack[state.undoStack.length - 1];
        state.undoStack = state.undoStack.slice(0, -1);
        state.redoStack = pushUndoState(state.redoStack, state.workingSnapshot);
        state.workingSnapshot = cloneSnapshot(previous);
        state.pendingChangedPaths = [...new Set([...state.pendingChangedPaths, "data"])];
        state.pendingChangeSource = "undo";
        state.resume = mergeResume(makeResumeRoot(state.resume), cloneSnapshot(previous));
      });
    },

    redo: () => {
      set((state) => {
        const isReadonly =
          Boolean(state.checkedOutCommitId) &&
          state.checkedOutCommitId !== state.activeBranch?.headCommitId;
        if (isReadonly || state.redoStack.length === 0 || !state.workingSnapshot) {
          return;
        }

        const next = state.redoStack[state.redoStack.length - 1];
        state.redoStack = state.redoStack.slice(0, -1);
        state.undoStack = pushUndoState(state.undoStack, state.workingSnapshot);
        state.workingSnapshot = cloneSnapshot(next);
        state.pendingChangedPaths = [...new Set([...state.pendingChangedPaths, "data"])];
        state.pendingChangeSource = "redo";
        state.resume = mergeResume(makeResumeRoot(state.resume), cloneSnapshot(next));
      });
    },

    collapsedSections: {},
    toggleCollapseSection: (id) => {
      set((state) => {
        state.collapsedSections[id] = !state.collapsedSections[id];
      });
    },
    expandAllSections: () => {
      set((state) => {
        state.collapsedSections = {};
      });
    },
    collapseAllSections: () => {
      set((state) => {
        const source = state.resume.data.sections;
        const collapsed: Record<string, boolean> = { basics: true };
        if (!source) {
          state.collapsedSections = collapsed;
          return;
        }

        for (const section of Object.keys(source)) {
          collapsed[section] = true;
        }
        for (const section of Object.keys(getCustomSections(state.resume.data))) {
          collapsed[`custom.${section}`] = true;
        }
        state.collapsedSections = collapsed;
      });
    },
  })),
);
