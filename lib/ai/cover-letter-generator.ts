import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "../../constants/llm";
import {
  COVER_LETTER_FOCUS_MODULES,
  COVER_LETTER_PRESETS,
  type CoverLetterFocusModule,
  type CoverLetterGenerationRequest,
  type CoverLetterGenerationResponse,
} from "./cover-letter-types";

const responseSchema = z.object({
  titleSuggestion: z.string(),
  contentText: z.string(),
  generationNotes: z.string(),
});

const presetInstructions: Record<(typeof COVER_LETTER_PRESETS)[number], string> = {
  balanced:
    "Balanced narrative: combine role-fit, measurable achievements, mission alignment, and culture fit with equal weight.",
  mission_culture:
    "Mission + culture narrative: center on mission alignment, values fit, and collaboration style, supported by concrete achievements.",
  growth_ipo:
    "Growth + IPO narrative: center on business momentum, market positioning, growth signals, and future prospects, tied to candidate impact.",
};

const moduleInstructions: Record<(typeof COVER_LETTER_FOCUS_MODULES)[number], string> = {
  recent_achievements:
    "Highlight recent measurable achievements from resume/profile and connect them to this role's priorities.",
  company_mission:
    "Reference the company mission/product purpose and explain authentic alignment with candidate motivations.",
  ipo_growth_signals:
    "Use growth/IPO/funding or strategic momentum signals where available and connect them to why this role is compelling.",
  future_prospects:
    "Discuss future direction and how the candidate can contribute to upcoming opportunities and challenges.",
  work_culture:
    "Address culture and working model fit with evidence from the candidate's collaboration style and prior environments.",
};

const toHtml = (contentText: string) => {
  const escaped = contentText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return escaped
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
};

const replaceEmDashes = (value: string) => value.replace(/\u2014/g, ",");

export const generateCoverLetterWithAi = async (
  input: CoverLetterGenerationRequest,
): Promise<CoverLetterGenerationResponse> => {
  const resolvedApiKey = input.apiKey ?? process.env.OPENAI_API_KEY;

  if (!resolvedApiKey) {
    throw new Error("Missing OpenAI API key");
  }

  const openai = createOpenAI({
    apiKey: resolvedApiKey,
    baseURL: input.baseURL || undefined,
  });

  const activeModuleInstructions = input.focusModules.map(
    (module: CoverLetterFocusModule) => `- ${moduleInstructions[module]}`,
  );

  const result = await generateObject({
    model: openai(input.model ?? DEFAULT_MODEL),
    schema: responseSchema,
    temperature: 0.3,
    maxOutputTokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
    system: [
      "You generate professional, specific cover letters for job applications.",
      "Output plain text that fits on one page and sounds human, direct, and confident.",
      "DONT USE EMDASHES WE HATE EMDASHES.",
      "Do not use visible citations or source markers in the final letter.",
      "Use company research naturally when available; if unavailable, rely on role and candidate context.",
      "Always include: header line, greeting, three concise body paragraphs, and closing.",
    ].join("\n"),
    prompt: [
      `Preset strategy: ${presetInstructions[input.preset]}`,
      "Enabled focus modules:",
      ...activeModuleInstructions,
      "",
      "Candidate resume JSON:",
      JSON.stringify(input.resume),
      "",
      "Career profile context JSON:",
      JSON.stringify(input.profile ?? {}),
      "",
      input.profile?.derived?.targetSummary
        ? `Profile opening angle:\n${input.profile.derived.targetSummary}`
        : "Profile opening angle: none",
      "",
      input.profile?.missingSignals?.length
        ? `Profile gaps to avoid overclaiming:\n${input.profile.missingSignals.join(" ")}`
        : "Profile gaps to avoid overclaiming: none",
      "",
      "Application context JSON:",
      JSON.stringify(input.application),
      "",
      input.customInstruction?.trim()
        ? `Additional user direction:\n${input.customInstruction.trim()}`
        : "Additional user direction: none",
      "",
      input.previousDraft?.trim()
        ? `Previous draft for context (improve, do not copy blindly):\n${input.previousDraft.trim()}`
        : "Previous draft for context: none",
      "",
      "Return fields:",
      "- titleSuggestion: short title for this cover letter record.",
      "- contentText: final full letter text (one page max).",
      "- generationNotes: brief internal summary of emphasis used.",
    ].join("\n"),
  });

  const titleSuggestion = replaceEmDashes(result.object.titleSuggestion.trim());
  const contentText = replaceEmDashes(result.object.contentText.trim());
  const generationNotes = replaceEmDashes(result.object.generationNotes.trim());

  return {
    titleSuggestion: titleSuggestion || "Generated Cover Letter",
    contentText,
    contentHtml: toHtml(contentText),
    generationNotes,
  };
};
