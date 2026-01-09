"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useResumeStore } from "@/stores/resume";
import { getResumeSnapshot, useAutoSaveStore } from "@/stores/auto-save";
import { useDebouncedCallback } from "use-debounce";

export function AutoSave() {
  const resumeId = useResumeStore((state) => state.resume?.id || state.resume?._id);
  const hasResumeData = useResumeStore((state) => Boolean(state.resume?.data));
  const resumeSnapshot = useResumeStore((state) => getResumeSnapshot(state.resume));
  const updateResume = useMutation(api.resumes.update);
  const setSaveFunction = useAutoSaveStore((state) => state.setSaveFunction);
  const setLastSaved = useAutoSaveStore((state) => state.setLastSaved);
  const setPendingSave = useAutoSaveStore((state) => state.setPendingSave);
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);
  const lastSaved = useAutoSaveStore((state) => state.lastSaved);
  const lastResumeIdRef = useRef<string | null>(null);

  // Register the save function with the store
  useEffect(() => {
    setSaveFunction(updateResume as any);
  }, [updateResume, setSaveFunction]);

  // Initialize lastSaved when resume first loads
  useEffect(() => {
    if (!resumeId || !hasResumeData) return;

    if (lastResumeIdRef.current !== resumeId) {
      lastResumeIdRef.current = resumeId;
      setLastSaved(resumeSnapshot);
      setPendingSave(false);
    }
  }, [resumeId, hasResumeData, resumeSnapshot, setLastSaved, setPendingSave]);

  // Debounced save for typing - 2 seconds after last change
  const debouncedSave = useDebouncedCallback(triggerSave, 2000, { maxWait: 5000 });

  // Watch for any changes in the resume data (backup auto-save)
  useEffect(() => {
    if (!resumeId || !hasResumeData) return;

    // Trigger debounced save if data changed
    if (resumeSnapshot !== lastSaved) {
      debouncedSave();
    }
  }, [resumeId, hasResumeData, resumeSnapshot, lastSaved, debouncedSave]);

  // Save on unmount (before leaving page)
  useEffect(() => {
    const handleBeforeUnload = () => {
      triggerSave();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      triggerSave();
    };
  }, [triggerSave]);

  return null;
}
