import type { ResumeAiProfileContext } from "./resume-ai-types";

export const COVER_LETTER_PRESETS = [
  "balanced",
  "mission_culture",
  "growth_ipo",
] as const;

export type CoverLetterPreset = (typeof COVER_LETTER_PRESETS)[number];

export const COVER_LETTER_FOCUS_MODULES = [
  "recent_achievements",
  "company_mission",
  "ipo_growth_signals",
  "future_prospects",
  "work_culture",
] as const;

export type CoverLetterFocusModule = (typeof COVER_LETTER_FOCUS_MODULES)[number];

export type CoverLetterVisibility = "private" | "public";

export type CoverLetterGenerationRequest = {
  resume: any;
  application: {
    id?: string;
    title?: string;
    company?: string;
    jobDescription?: string;
    categories?: string[];
    companyResearch?: {
      companyName: string;
      shortDescription: string;
      companyOverview: string;
      recentEventsNews: string;
      strengthsGoodAspects: string;
      fundingFinancials: string;
      futureOutlook: string;
      missionValues: string;
      otherNotablePoints: string;
    };
  };
  profile?: ResumeAiProfileContext | null;
  preset: CoverLetterPreset;
  focusModules: CoverLetterFocusModule[];
  customInstruction?: string;
  previousDraft?: string;
  apiKey?: string | null;
  model?: string | null;
  maxTokens?: number | null;
  baseURL?: string | null;
};

export type CoverLetterGenerationResponse = {
  titleSuggestion: string;
  contentHtml: string;
  contentText: string;
  generationNotes: string;
};

export const COVER_LETTER_PRESET_LABELS: Record<CoverLetterPreset, string> = {
  balanced: "Balanced",
  mission_culture: "Mission + Culture",
  growth_ipo: "Growth + IPO",
};

export const COVER_LETTER_MODULE_LABELS: Record<CoverLetterFocusModule, string> = {
  recent_achievements: "Recent Achievements",
  company_mission: "Company Mission",
  ipo_growth_signals: "IPO / Growth Signals",
  future_prospects: "Future Prospects",
  work_culture: "Work Culture",
};

export const COVER_LETTER_PRESET_DEFAULT_MODULES: Record<
  CoverLetterPreset,
  CoverLetterFocusModule[]
> = {
  balanced: ["recent_achievements", "company_mission", "work_culture"],
  mission_culture: ["company_mission", "work_culture", "future_prospects"],
  growth_ipo: ["ipo_growth_signals", "future_prospects", "recent_achievements"],
};

export const getDefaultModulesForPreset = (
  preset: CoverLetterPreset,
): CoverLetterFocusModule[] => [...(COVER_LETTER_PRESET_DEFAULT_MODULES[preset] ?? [])];
