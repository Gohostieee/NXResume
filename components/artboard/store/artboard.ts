import type { ResumeData } from "@reactive-resume/schema";
import { defaultResumeData } from "@reactive-resume/schema";
import { create } from "zustand";

type ArtboardStore = {
  resume: ResumeData;
  currentResume: ResumeData;
  baseResume: ResumeData | null;
  proposalResume: ResumeData | null;
  diffMode: boolean;
  setResume: (resume: ResumeData) => void;
  setPreviewState: (payload: {
    currentResume: ResumeData;
    baseResume?: ResumeData | null;
    proposalResume?: ResumeData | null;
    diffMode?: boolean;
  }) => void;
};

export const useArtboardStore = create<ArtboardStore>()((set) => ({
  resume: defaultResumeData,
  currentResume: defaultResumeData,
  baseResume: null,
  proposalResume: null,
  diffMode: false,
  setResume: (resume) =>
    set({
      resume,
      currentResume: resume,
      baseResume: null,
      proposalResume: null,
      diffMode: false,
    }),
  setPreviewState: ({ currentResume, baseResume = null, proposalResume = null, diffMode = false }) =>
    set({
      resume: diffMode && proposalResume ? proposalResume : currentResume,
      currentResume,
      baseResume,
      proposalResume,
      diffMode,
    }),
}));
