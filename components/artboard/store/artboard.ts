import type { ResumeData } from "@reactive-resume/schema";
import { defaultResumeData } from "@reactive-resume/schema";
import { create } from "zustand";

type ArtboardStore = {
  resume: ResumeData;
  setResume: (resume: ResumeData) => void;
};

export const useArtboardStore = create<ArtboardStore>()((set) => ({
  resume: defaultResumeData,
  setResume: (resume) => set({ resume }),
}));
