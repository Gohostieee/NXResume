export const AI_LOADING_PRESETS = {
  applicationIntake: {
    title: "Importing job description",
    description:
      "We are extracting the role details, researching the company, and saving the application.",
    stages: [
      "Parsing job description",
      "Extracting role and company",
      "Researching company",
      "Saving application",
    ],
  },
  coverLetterCreate: {
    title: "Generating cover letter",
    description:
      "We are reading your resume and job context, drafting the letter, and saving the new draft.",
    stages: [
      "Reading resume and job context",
      "Choosing the best angle",
      "Drafting the letter",
      "Saving the draft",
    ],
  },
  coverLetterRegenerate: {
    title: "Regenerating cover letter",
    description:
      "We are reviewing the current version, drafting a stronger revision, and saving it as a new version.",
    stages: [
      "Reviewing the current version",
      "Planning revisions",
      "Drafting a new version",
      "Saving the new version",
    ],
  },
  resumePdfImport: {
    title: "Importing resume PDF",
    description:
      "We are reading the uploaded PDF, mapping it into NXResume fields, and saving the imported resume.",
    stages: [
      "Loading uploaded PDF",
      "Extracting resume content",
      "Mapping NXResume fields",
      "Saving imported resume",
    ],
  },
  resumeApply: {
    title: "Updating tailored resume",
    description:
      "We are reviewing the application context, rewriting the selected content, and applying the update.",
    stages: [
      "Reviewing resume and job context",
      "Planning targeted edits",
      "Rewriting selected sections",
      "Applying changes",
    ],
  },
  guidedAnalyze: {
    title: "Analyzing guided request",
    description:
      "We are comparing the resume to the application and preparing any follow-up questions before changes are made.",
    stages: [
      "Reviewing your request",
      "Comparing resume to the job",
      "Finding missing details",
      "Preparing follow-up questions",
    ],
  },
} as const;

export type AiLoadingPresetKey = keyof typeof AI_LOADING_PRESETS;
