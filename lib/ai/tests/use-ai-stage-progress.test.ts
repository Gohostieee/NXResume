import { describe, expect, it } from "vitest";
import { getNextAiStage, getResolvedAiStage } from "../use-ai-stage-progress";

describe("useAiStageProgress helpers", () => {
  it("advances stages until the last stage", () => {
    expect(getNextAiStage(0, 4)).toBe(1);
    expect(getNextAiStage(1, 4)).toBe(2);
    expect(getNextAiStage(2, 4)).toBe(3);
    expect(getNextAiStage(3, 4)).toBe(3);
    expect(getNextAiStage(8, 4)).toBe(3);
  });

  it("resets to the first stage when inactive", () => {
    expect(getResolvedAiStage({ isActive: false, currentStage: 3, stageCount: 4 })).toBe(0);
  });

  it("clamps the active stage while running", () => {
    expect(getResolvedAiStage({ isActive: true, currentStage: -1, stageCount: 4 })).toBe(0);
    expect(getResolvedAiStage({ isActive: true, currentStage: 2, stageCount: 4 })).toBe(2);
    expect(getResolvedAiStage({ isActive: true, currentStage: 9, stageCount: 4 })).toBe(3);
  });
});
