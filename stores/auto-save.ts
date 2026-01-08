import { create } from "zustand";
import { useResumeStore } from "./resume";
import type { Id } from "@/convex/_generated/dataModel";

type AutoSaveStore = {
  isSaving: boolean;
  pendingSave: boolean;
  lastSaved: string;
  saveFunction: ((args: { id: Id<"resumes">; data: any; title: string; visibility: string }) => Promise<any>) | null;

  // Actions
  setSaveFunction: (fn: (args: { id: Id<"resumes">; data: any; title: string; visibility: string }) => Promise<any>) => void;
  triggerSave: () => Promise<void>;
  setIsSaving: (saving: boolean) => void;
  setLastSaved: (data: string) => void;
  setPendingSave: (pending: boolean) => void;
};

type ResumeSnapshotInput = {
  data?: unknown;
  title?: string;
  visibility?: string;
};

export const getResumeSnapshot = (resume: ResumeSnapshotInput) =>
  JSON.stringify({
    data: resume.data ?? null,
    title: resume.title ?? "",
    visibility: resume.visibility ?? "",
  });

export const useAutoSaveStore = create<AutoSaveStore>((set, get) => ({
  isSaving: false,
  pendingSave: false,
  lastSaved: "",
  saveFunction: null,

  setSaveFunction: (fn) => set({ saveFunction: fn }),

  setIsSaving: (saving) => set({ isSaving: saving }),

  setLastSaved: (data) => set({ lastSaved: data }),

  setPendingSave: (pending) => set({ pendingSave: pending }),

  triggerSave: async () => {
    const { isSaving, saveFunction, lastSaved } = get();

    if (!saveFunction) return;

    if (isSaving) {
      set({ pendingSave: true });
      return;
    }

    const resume = useResumeStore.getState().resume;
    const resumeId = resume?.id || resume?._id;
    if (!resumeId || !resume?.data) return;

    const currentData = getResumeSnapshot(resume);

    // Skip if nothing changed
    if (currentData === lastSaved) return;

    set({ isSaving: true });

    try {
      await saveFunction({
        id: resumeId as Id<"resumes">,
        data: resume.data,
        title: resume.title,
        visibility: resume.visibility,
      });
      set({ lastSaved: currentData, isSaving: false });
    } catch (error) {
      console.error("Save failed:", error);
      set({ isSaving: false });
    } finally {
      const { pendingSave } = get();
      if (pendingSave) {
        set({ pendingSave: false });
        queueMicrotask(() => {
          void get().triggerSave();
        });
      }
    }
  },
}));

// Hook to trigger save - can be used in components
export const useTriggerSave = () => {
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);
  return triggerSave;
};
