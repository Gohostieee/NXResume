import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GuidedPresetId, SectionScopeId } from "@/lib/ai/guided-resume-actions";

export type RecentAiRun = {
  presetId: GuidedPresetId | null;
  prompt: string;
  targetRole: string;
  sectionScope: SectionScopeId;
  createdAt: number;
};

type AiActionsStore = {
  recentRuns: RecentAiRun[];
  addRecentRun: (run: Omit<RecentAiRun, "createdAt">) => void;
};

const MAX_RECENT_RUNS = 6;

const getRunSignature = (run: Omit<RecentAiRun, "createdAt">) =>
  JSON.stringify({
    presetId: run.presetId,
    prompt: run.prompt.trim(),
    targetRole: run.targetRole.trim(),
    sectionScope: run.sectionScope,
  });

export const useAiActionsStore = create<AiActionsStore>()(
  persist(
    (set) => ({
      recentRuns: [],
      addRecentRun: (run) => {
        const normalized = {
          ...run,
          prompt: run.prompt.trim(),
          targetRole: run.targetRole.trim(),
          createdAt: Date.now(),
        };
        const signature = getRunSignature(normalized);

        set((state) => {
          const remaining = state.recentRuns.filter(
            (item) =>
              getRunSignature({
                presetId: item.presetId,
                prompt: item.prompt,
                targetRole: item.targetRole,
                sectionScope: item.sectionScope,
              }) !== signature,
          );

          return {
            recentRuns: [normalized, ...remaining].slice(0, MAX_RECENT_RUNS),
          };
        });
      },
    }),
    { name: "ai-actions" },
  ),
);
