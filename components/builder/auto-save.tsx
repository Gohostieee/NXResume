"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useResumeStore } from "@/stores/resume";
import { getResumeSnapshot, useAutoSaveStore } from "@/stores/auto-save";
import { useDebouncedCallback } from "use-debounce";
import type { Id } from "@/convex/_generated/dataModel";

export function AutoSave() {
  const resume = useResumeStore((state) => state.resume);
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
    const resumeId = resume?.id || resume?._id;
    if (!resumeId || !resume?.data) return;

    if (lastResumeIdRef.current !== resumeId) {
      const data = getResumeSnapshot(resume);
      lastResumeIdRef.current = resumeId;
      setLastSaved(data);
      setPendingSave(false);
    }
  }, [resume?.id, resume?._id, resume?.data, setLastSaved, setPendingSave]);

  // Debounced save for typing - 2 seconds after last change
  const debouncedSave = useDebouncedCallback(triggerSave, 2000, { maxWait: 5000 });

  // Watch for any changes in the resume data (backup auto-save)
  useEffect(() => {
    const resumeId = resume?.id || resume?._id;
    if (!resumeId || !resume?.data) return;

    const currentData = getResumeSnapshot(resume);

    // Trigger debounced save if data changed
    if (currentData !== lastSaved) {
      debouncedSave();
    }
  }, [resume, lastSaved, debouncedSave]);

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
