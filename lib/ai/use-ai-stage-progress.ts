import { useEffect, useState } from "react";

type UseAiStageProgressInput = {
  isActive: boolean;
  stageCount: number;
  intervalMs?: number;
};

const getLastStageIndex = (stageCount: number) => Math.max(stageCount - 1, 0);

export const getResolvedAiStage = ({
  isActive,
  currentStage,
  stageCount,
}: {
  isActive: boolean;
  currentStage: number;
  stageCount: number;
}) => {
  if (!isActive) return 0;
  return Math.min(Math.max(currentStage, 0), getLastStageIndex(stageCount));
};

export const getNextAiStage = (currentStage: number, stageCount: number) =>
  Math.min(Math.max(currentStage, 0) + 1, getLastStageIndex(stageCount));

export const useAiStageProgress = ({
  isActive,
  stageCount,
  intervalMs = 1000,
}: UseAiStageProgressInput) => {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setActiveStage(0);
      return;
    }

    setActiveStage((currentStage) =>
      getResolvedAiStage({ isActive: true, currentStage, stageCount }),
    );

    if (stageCount <= 1) return;

    const interval = window.setInterval(() => {
      setActiveStage((currentStage) => getNextAiStage(currentStage, stageCount));
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, isActive, stageCount]);

  return getResolvedAiStage({ isActive, currentStage: activeStage, stageCount });
};
