import { ONE_PAGE_RESUME_GUIDE } from "./one-page-resume-guide";

export type ResumeAiStrategy = "generator";

export type QuickPresetId =
  | "light_edit"
  | "cut_focus"
  | "one_page_shorten"
  | "keywords"
  | "role_pivot"
  | "overhaul"
  | "perfect_resume";

export type GuidedPresetId = Exclude<QuickPresetId, "perfect_resume">;

export type SectionScopeId =
  | "full_resume"
  | "summary_experience_skills"
  | "summary"
  | "experience"
  | "skills";

export type GuidedRunAnswer = {
  id: string;
  question: string;
  reasoning: string;
  answer: string;
};

export type GuidedRunDraft = {
  presetId: GuidedPresetId | null;
  prompt: string;
  targetRole: string;
  sectionScope: SectionScopeId;
};

type PresetInstructionInput = {
  targetRole: string;
  hasApplicationContext: boolean;
};

type InstructionContextOptions = {
  hasApplicationContext?: boolean;
};

export type AiPresetDefinition = {
  id: QuickPresetId;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  strategy: ResumeAiStrategy;
  quickEnabled: boolean;
  guidedEnabled: boolean;
  requiresTargetRole: boolean;
  buildInstruction: (input: PresetInstructionInput) => string;
};

export type SectionScopeDefinition = {
  id: SectionScopeId;
  label: string;
  description: string;
  instruction: string;
};

export const SECTION_SCOPE_OPTIONS: SectionScopeDefinition[] = [
  {
    id: "full_resume",
    label: "Full Resume",
    description: "Allow the AI to work across the full resume.",
    instruction: "The AI may update any resume section when it helps the requested change.",
  },
  {
    id: "summary_experience_skills",
    label: "Summary + Experience + Skills",
    description: "Focus on the sections that most affect job fit.",
    instruction:
      "Limit changes to the summary, experience, and skills sections. Leave all other sections unchanged unless a factual correction is necessary.",
  },
  {
    id: "summary",
    label: "Summary Only",
    description: "Only update the summary section.",
    instruction:
      "Only update the summary section. Leave experience, skills, and all other sections unchanged.",
  },
  {
    id: "experience",
    label: "Experience Only",
    description: "Only update work experience bullets and descriptions.",
    instruction:
      "Only update the experience section. Leave summary, skills, and all other sections unchanged.",
  },
  {
    id: "skills",
    label: "Skills Only",
    description: "Only refine or reorganize the skills section.",
    instruction:
      "Only update the skills section. Leave summary, experience, and all other sections unchanged.",
  },
];

export const AI_ACTION_PRESETS: AiPresetDefinition[] = [
  {
    id: "light_edit",
    title: "Light Edit",
    description: "Tighten wording, improve grammar, and keep existing structure.",
    impact: "low",
    strategy: "generator",
    quickEnabled: true,
    guidedEnabled: true,
    requiresTargetRole: false,
    buildInstruction: () =>
      "Apply a light polish only. Keep structure and meaning intact, improve clarity and grammar, and avoid major rewrites.",
  },
  {
    id: "cut_focus",
    title: "Cut + Focus",
    description: "Remove low-value content and keep the most relevant, measurable impact.",
    impact: "medium",
    strategy: "generator",
    quickEnabled: true,
    guidedEnabled: true,
    requiresTargetRole: false,
    buildInstruction: ({ targetRole, hasApplicationContext }) =>
      hasApplicationContext
        ? "Trim low-relevance content for this application. Keep high-impact bullets, remove repetition, and keep the resume concise."
        : [
            "Trim low-relevance content across this resume.",
            targetRole
              ? `Use ${targetRole} as the priority role lens when deciding what stays and what gets compressed.`
              : "Use the resume's strongest marketable direction when deciding what stays and what gets compressed.",
            "Keep high-impact bullets, remove repetition, and keep the resume concise.",
          ].join(" "),
  },
  {
    id: "one_page_shorten",
    title: "One Page",
    description: "Compress the resume to one page while preserving the strongest relevant impact.",
    impact: "high",
    strategy: "generator",
    quickEnabled: true,
    guidedEnabled: true,
    requiresTargetRole: false,
    buildInstruction: ({ targetRole, hasApplicationContext }) =>
      [
        hasApplicationContext
          ? "Shorten this resume to a true one-page version for the attached application."
          : "Shorten this resume to a true one-page version.",
        targetRole
          ? `Use ${targetRole} as the priority role lens when deciding what stays, what gets compressed, and what gets removed.`
          : hasApplicationContext
            ? "Use the attached application context as the priority lens when deciding what stays, what gets compressed, and what gets removed."
            : "Use the resume's strongest marketable angle as the priority lens when deciding what stays, what gets compressed, and what gets removed.",
        "Keep all claims factual.",
        "Preserve the strongest, most relevant achievements and metrics.",
        "Aggressively remove filler, repetition, outdated content, and low-value details before cutting stronger evidence.",
        "If needed, rewrite summaries, experience bullets, skills, contact details, and metadata/layout choices to fit one page cleanly.",
        "Follow this compression guide exactly:",
        ONE_PAGE_RESUME_GUIDE,
      ].join("\n\n"),
  },
  {
    id: "keywords",
    title: "Keyword Match",
    description: "Align resume wording to the target role or job context while keeping it natural.",
    impact: "medium",
    strategy: "generator",
    quickEnabled: true,
    guidedEnabled: true,
    requiresTargetRole: false,
    buildInstruction: ({ targetRole, hasApplicationContext }) =>
      hasApplicationContext
        ? "Optimize wording and section content to align with the job description keywords and categories. Keep language natural and truthful."
        : targetRole
          ? `Optimize wording and section content to align with the keywords, themes, and expectations of a ${targetRole} role. Keep language natural and truthful.`
          : "Optimize wording and section content for strong recruiter searchability, clear positioning, and natural keyword coverage. Keep language natural and truthful.",
  },
  {
    id: "role_pivot",
    title: "Role Pivot",
    description: "Reframe experience toward a target role profile.",
    impact: "high",
    strategy: "generator",
    quickEnabled: true,
    guidedEnabled: true,
    requiresTargetRole: true,
    buildInstruction: ({ targetRole }) =>
      `Pivot this resume toward a ${targetRole} role. Rewrite summaries, highlights, and skills emphasis to match that role while staying factual.`,
  },
  {
    id: "overhaul",
    title: "Full Overhaul",
    description: "Rebuild the resume narrative from top to bottom for the target opportunity.",
    impact: "high",
    strategy: "generator",
    quickEnabled: true,
    guidedEnabled: true,
    requiresTargetRole: true,
    buildInstruction: ({ targetRole, hasApplicationContext }) =>
      hasApplicationContext
        ? `Perform a full rewrite to tailor this resume to the attached job${targetRole ? ` and target role ${targetRole}` : ""}. Keep all claims factual and improve relevance, clarity, and impact.`
        : `Perform a full rewrite to position this resume for ${targetRole || "its strongest target role"}. Keep all claims factual and improve relevance, clarity, and impact.`,
  },
  {
    id: "perfect_resume",
    title: "Perfect Resume",
    description:
      "Craft the strongest possible version of this resume for the target role using the user's real information.",
    impact: "high",
    strategy: "generator",
    quickEnabled: true,
    guidedEnabled: false,
    requiresTargetRole: false,
    buildInstruction: ({ targetRole, hasApplicationContext }) =>
      [
        hasApplicationContext
          ? `Craft the strongest possible resume for ${targetRole || "this role"} using the user's real background.`
          : `Craft the strongest possible version of this resume${targetRole ? ` for ${targetRole}` : ""} using the user's real background.`,
        hasApplicationContext
          ? "Use the existing resume, profile data, and application context as the source of truth."
          : "Use the existing resume and profile data as the source of truth.",
        "Do not invent employers, schools, projects, dates, metrics, or credentials.",
        "If important information is missing, use clearly labeled TODO placeholders instead of fictional content.",
        "Optimize aggressively for clarity, relevance, impact, and hiring quality.",
      ].join(" "),
  },
];

const buildCustomPromptIntro = ({ hasApplicationContext }: PresetInstructionInput) =>
  hasApplicationContext
    ? "Use the user's custom direction as the primary instruction while keeping all claims factual and aligned to the attached application."
    : "Use the user's custom direction as the primary instruction while keeping all claims factual and aligned to the resume's target direction.";

export const getPresetById = (id: QuickPresetId) =>
  AI_ACTION_PRESETS.find((preset) => preset.id === id);

export const getGuidedPresetById = (id: GuidedPresetId) => {
  const preset = getPresetById(id);
  if (!preset || !preset.guidedEnabled) {
    throw new Error(`Unsupported guided preset: ${id}`);
  }
  return preset;
};

export const getSectionScopeById = (id: SectionScopeId) =>
  SECTION_SCOPE_OPTIONS.find((scope) => scope.id === id) ?? SECTION_SCOPE_OPTIONS[0];

export const buildPresetInstruction = (
  presetId: QuickPresetId,
  targetRole: string,
  options?: InstructionContextOptions,
) => {
  const preset = getPresetById(presetId);
  if (!preset) {
    throw new Error(`Unknown AI preset: ${presetId}`);
  }
  return preset.buildInstruction({
    targetRole: targetRole.trim(),
    hasApplicationContext: options?.hasApplicationContext ?? true,
  });
};

export const buildGuidedAnalysisPrompt = (
  { presetId, prompt, targetRole }: GuidedRunDraft,
  options?: InstructionContextOptions,
) => {
  const basePrompt = presetId ? buildPresetInstruction(presetId, targetRole, options) : "";
  return [basePrompt, prompt.trim()].filter(Boolean).join("\n\n");
};

export const buildGuidedResumeInstruction = (
  {
    presetId,
    prompt,
    targetRole,
    sectionScope,
    answers,
  }: GuidedRunDraft & { answers: GuidedRunAnswer[] },
  options?: InstructionContextOptions,
) => {
  const trimmedPrompt = prompt.trim();
  const trimmedTargetRole = targetRole.trim();
  const scope = getSectionScopeById(sectionScope);
  const preset = presetId ? getGuidedPresetById(presetId) : null;
  const baseInstruction = preset
    ? preset.buildInstruction({
        targetRole: trimmedTargetRole,
        hasApplicationContext: options?.hasApplicationContext ?? true,
      })
    : buildCustomPromptIntro({
        targetRole: trimmedTargetRole,
        hasApplicationContext: options?.hasApplicationContext ?? true,
      });

  const clarificationLines = answers
    .map((answer) => ({
      question: answer.question.trim(),
      answer: answer.answer.trim(),
    }))
    .filter((answer) => answer.question.length > 0 && answer.answer.length > 0)
    .map((answer) => `- ${answer.question}\n  Answer: ${answer.answer}`);

  return [
    "Guided AI run context:",
    preset ? `Starting preset: ${preset.title}.` : "Starting mode: Custom prompt.",
    trimmedTargetRole ? `Target role: ${trimmedTargetRole}.` : null,
    `Scope: ${scope.label}.`,
    "",
    "Base instruction:",
    baseInstruction,
    trimmedPrompt ? "" : null,
    trimmedPrompt ? "Additional user direction:" : null,
    trimmedPrompt || null,
    clarificationLines.length > 0 ? "" : null,
    clarificationLines.length > 0 ? "Clarifications from the user:" : null,
    clarificationLines.length > 0 ? clarificationLines.join("\n") : null,
    "",
    "Execution constraints:",
    `- ${scope.instruction}`,
    "- Keep all claims factual and grounded in the user's real background.",
    "- Use the clarification answers as hard context when deciding what to rewrite.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
};
