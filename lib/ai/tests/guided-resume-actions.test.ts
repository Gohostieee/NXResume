import { describe, expect, it } from "vitest";
import { buildGuidedResumeInstruction, buildPresetInstruction } from "../guided-resume-actions";

describe("buildGuidedResumeInstruction", () => {
  it("includes preset context, scope, and clarifications deterministically", () => {
    const instruction = buildGuidedResumeInstruction({
      presetId: "overhaul",
      prompt: "Focus on React platform work and leadership scope.",
      targetRole: "Staff Frontend Engineer",
      sectionScope: "summary_experience_skills",
      answers: [
        {
          id: "issue-1",
          question: "Do you have any React platform achievements to highlight?",
          reasoning: "The job description leans heavily on platform ownership.",
          answer: "I led a shared component migration used by 12 product teams.",
        },
        {
          id: "issue-2",
          question: "What leadership examples should be emphasized?",
          reasoning: "The role expects mentorship and technical direction.",
          answer: "I mentored 4 engineers and ran frontend architecture reviews.",
        },
      ],
    });

    expect(instruction).toContain("Starting preset: Full Overhaul.");
    expect(instruction).toContain("Target role: Staff Frontend Engineer.");
    expect(instruction).toContain("Scope: Summary + Experience + Skills.");
    expect(instruction).toContain("Additional user direction:");
    expect(instruction).toContain("Focus on React platform work and leadership scope.");
    expect(instruction).toContain(
      "Answer: I led a shared component migration used by 12 product teams.",
    );
    expect(instruction).toContain(
      "Answer: I mentored 4 engineers and ran frontend architecture reviews.",
    );
    expect(instruction).toContain("Limit changes to the summary, experience, and skills sections.");
  });

  it("supports custom prompts without a preset", () => {
    const instruction = buildGuidedResumeInstruction({
      presetId: null,
      prompt: "Rewrite only the summary for a B2B SaaS customer success role.",
      targetRole: "",
      sectionScope: "summary",
      answers: [],
    });

    expect(instruction).toContain("Starting mode: Custom prompt.");
    expect(instruction).toContain("Scope: Summary Only.");
    expect(instruction).toContain("Rewrite only the summary for a B2B SaaS customer success role.");
    expect(instruction).not.toContain("Clarifications from the user:");
    expect(instruction).toContain("Only update the summary section.");
  });

  it("switches preset instructions for general resumes without application context", () => {
    const instruction = buildPresetInstruction("keywords", "Staff Frontend Engineer", {
      hasApplicationContext: false,
    });

    expect(instruction).toContain("Staff Frontend Engineer role");
    expect(instruction).not.toContain("job description keywords");
  });

  it("switches custom guided instructions for general resumes without application context", () => {
    const instruction = buildGuidedResumeInstruction(
      {
        presetId: null,
        prompt: "Rewrite the resume around frontend platform leadership.",
        targetRole: "Staff Frontend Engineer",
        sectionScope: "full_resume",
        answers: [],
      },
      {
        hasApplicationContext: false,
      },
    );

    expect(instruction).toContain("Target role: Staff Frontend Engineer.");
    expect(instruction).toContain("aligned to the resume's target direction");
    expect(instruction).not.toContain("attached application");
  });
});
