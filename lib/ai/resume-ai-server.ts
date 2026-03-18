import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "../../constants/llm";
import {
  buildGuidedAnalysisPrompt,
  getGuidedPresetById,
  getSectionScopeById,
  type GuidedPresetId,
  type SectionScopeId,
} from "./guided-resume-actions";
import { resumeEditSchema } from "./resume-edit-schema";
import { resumeEditorGuide } from "./resume-editor-guide";
import { runWorkflow } from "./resume-analyzer";
import { generateResumeWithAi } from "./resume-generator";
import type {
  GuidedRunIssue,
  ResumeAiApplicationContext,
  ResumeAiEditStrategy,
  ResumeAiProfileContext,
} from "./resume-ai-types";
import type { ResumeData } from "../schema";

const MAX_GUIDED_QUESTIONS = 10;

const QUESTION_PREFIX_PATTERN =
  /^(can you|could you|would you|will you|do you|did you|have you|please|share|tell me|describe|provide|add|list)\s+/i;

const normalizeQuestion = (value: string) =>
  value
    .trim()
    .replace(/[?!.]+$/g, "")
    .replace(QUESTION_PREFIX_PATTERN, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

export const applyGeneratedProfileColumns = (resume: ResumeData): ResumeData => {
  const profileCount = resume.sections.profiles.items.length;
  const nextColumns = Math.max(1, Math.min(profileCount || 1, 5));

  if (resume.sections.profiles.columns === nextColumns) {
    return resume;
  }

  return {
    ...resume,
    sections: {
      ...resume.sections,
      profiles: {
        ...resume.sections.profiles,
        columns: nextColumns,
      },
    },
  };
};

export const sanitizeGuidedIssues = (
  issues: Array<{ reasoning?: string; question?: string }>,
): GuidedRunIssue[] => {
  const seenQuestions = new Set<string>();

  return issues
    .map((issue) => ({
      reasoning: issue.reasoning?.trim() ?? "",
      question: issue.question?.trim() ?? "",
    }))
    .filter((issue) => issue.reasoning.length > 0 && issue.question.length > 0)
    .filter((issue) => {
      const normalizedQuestion = normalizeQuestion(issue.question);

      if (!normalizedQuestion || seenQuestions.has(normalizedQuestion)) {
        return false;
      }

      seenQuestions.add(normalizedQuestion);
      return true;
    })
    .slice(0, MAX_GUIDED_QUESTIONS)
    .map((issue, index) => ({
      id: `issue-${index + 1}`,
      reasoning: issue.reasoning,
      question: issue.question,
    }));
};

export const buildResumeAnalysisInput = ({
  resume,
  profile,
  application,
  presetId,
  prompt,
  targetRole,
  sectionScope,
}: {
  resume: ResumeData;
  profile?: ResumeAiProfileContext;
  application?: ResumeAiApplicationContext;
  presetId?: GuidedPresetId | null;
  prompt: string;
  targetRole?: string;
  sectionScope?: SectionScopeId;
}) => {
  const preset = presetId ? getGuidedPresetById(presetId) : null;
  const scope = getSectionScopeById(sectionScope ?? "full_resume");
  const resolvedPrompt = buildGuidedAnalysisPrompt(
    {
      presetId: presetId ?? null,
      prompt,
      targetRole: targetRole ?? "",
      sectionScope: sectionScope ?? "full_resume",
    },
    {
      hasApplicationContext: Boolean(application),
    },
  );

  return [
    "Requested AI resume change analysis:",
    preset ? `Preset: ${preset.title}` : "Preset: Custom Prompt",
    targetRole?.trim() ? `Target role: ${targetRole.trim()}` : null,
    `Requested scope: ${scope.label}`,
    "",
    "User prompt:",
    resolvedPrompt,
    "",
    "Current resume JSON:",
    JSON.stringify(resume),
    "",
    "Career profile context:",
    JSON.stringify(profile ?? {}),
    "",
    "Application context:",
    JSON.stringify(application ?? {}),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
};

export const runResumeAnalysis = async ({
  resume,
  profile,
  application,
  presetId,
  prompt,
  targetRole,
  sectionScope,
  model,
}: {
  resume: ResumeData;
  profile?: ResumeAiProfileContext;
  application?: ResumeAiApplicationContext;
  presetId?: GuidedPresetId | null;
  prompt: string;
  targetRole?: string;
  sectionScope?: SectionScopeId;
  model?: string | null;
}) => {
  const output = await runWorkflow({
    input_as_text: buildResumeAnalysisInput({
      resume,
      profile,
      application,
      presetId,
      prompt,
      targetRole,
      sectionScope,
    }),
    model,
  });

  return sanitizeGuidedIssues(output?.issues ?? []);
};

export const runResumeEdit = async ({
  strategy,
  instruction,
  resume,
  profile,
  application,
  apiKey,
  model,
  maxTokens,
  baseURL,
}: {
  strategy?: ResumeAiEditStrategy;
  instruction: string;
  resume: ResumeData;
  profile?: ResumeAiProfileContext;
  application?: ResumeAiApplicationContext;
  apiKey?: string;
  model?: string | null;
  maxTokens?: number | null;
  baseURL?: string | null;
}) => {
  const resolvedApiKey = apiKey ?? process.env.OPENAI_API_KEY;

  if (!resolvedApiKey) {
    throw new Error("Missing OpenAI API key");
  }

  if (strategy === "generator") {
    const generatedResume = await generateResumeWithAi({
      resume,
      instruction,
      profile,
      application,
      apiKey: resolvedApiKey,
      model: model ?? DEFAULT_MODEL,
      baseURL,
    });

    return applyGeneratedProfileColumns(generatedResume);
  }

  const openai = createOpenAI({
    apiKey: resolvedApiKey,
    baseURL: baseURL || undefined,
  });

  const result = await generateObject({
    model: openai(model ?? DEFAULT_MODEL),
    schema: resumeEditSchema,
    system: resumeEditorGuide,
    prompt: [
      "Current resume JSON:",
      JSON.stringify(resume),
      "",
      "Career profile context (may be partial):",
      JSON.stringify(profile ?? {}),
      "",
      "Application context for job-tailored resumes (may be empty):",
      JSON.stringify(application ?? {}),
      "",
      "User instruction:",
      instruction,
      "",
      "Return the full updated ResumeData JSON only.",
    ].join("\n"),
    temperature: 0.2,
    maxOutputTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
  });

  return result.object;
};
