import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "../../constants/llm";
import { researchCompany } from "./company-researcher";
import {
  type ApplicationIntakeResponse,
  type CompanyResearchDetails,
  UNKNOWN_COMPANY,
  UNKNOWN_TITLE,
} from "./application-intake-types";

const MAX_CATEGORIES = 10;

const extractionSchema = z.object({
  title: z.string(),
  company: z.string(),
  categories: z.array(z.string()),
});

const companyResearchSchema = z.object({
  companyName: z.string(),
  shortDescription: z.string(),
  companyOverview: z.string(),
  recentEventsNews: z.string(),
  strengthsGoodAspects: z.string(),
  fundingFinancials: z.string(),
  futureOutlook: z.string(),
  missionValues: z.string(),
  otherNotablePoints: z.string(),
});

const normalizeField = (value: string, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

const normalizeCategories = (values: string[]) => {
  const normalized = values
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, MAX_CATEGORIES);

  return Array.from(new Set(normalized));
};

const summarizeJobDescription = (jobDescription: string) => {
  const compact = jobDescription.replace(/\s+/g, " ").trim();
  return compact.slice(0, 280);
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause:
        cause instanceof Error
          ? {
              name: cause.name,
              message: cause.message,
            }
          : cause,
    };
  }

  return { value: error };
};

export const extractApplicationFromDescriptionWithAi = async ({
  jobDescription,
  model,
  maxTokens,
}: {
  jobDescription: string;
  model?: string | null;
  maxTokens?: number | null;
}): Promise<ApplicationIntakeResponse> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key");
  }

  const requestId = crypto.randomUUID();

  try {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const result = await generateObject({
      model: openai(model ?? DEFAULT_MODEL),
      schema: extractionSchema,
      temperature: 0.1,
      maxOutputTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      system: [
        "You extract structured fields from job descriptions.",
        "Return concise values for title and company when present; use empty strings if unclear.",
        "Return categories as short lowercase tags inferred from skills/stack/domain in the job post.",
        "Examples: javascript, typescript, frontend, react, nodejs, backend, devops, python, aws.",
        "Return 3-10 categories when possible. If unclear, return an empty array.",
      ].join("\n"),
      prompt: [
        "Extract the following fields from this job description:",
        "- title",
        "- company",
        "- categories (array of short lowercase tags)",
        "",
        "Job description:",
        jobDescription,
      ].join("\n"),
    });

    const title = normalizeField(result.object.title, UNKNOWN_TITLE);
    const company = normalizeField(result.object.company, UNKNOWN_COMPANY);
    const categories = normalizeCategories(result.object.categories);

    let companyResearch: CompanyResearchDetails | undefined;
    let companyResearchWarning: string | undefined;

    if (company !== UNKNOWN_COMPANY) {
      try {
        const shortDescription = [
          title !== UNKNOWN_TITLE ? `Role: ${title}.` : "",
          categories.length > 0 ? `Categories: ${categories.join(", ")}.` : "",
          summarizeJobDescription(jobDescription),
        ]
          .filter(Boolean)
          .join(" ");

        companyResearch = companyResearchSchema.parse(
          await researchCompany({
            companyName: company,
            shortDescription,
            apiKey: process.env.OPENAI_API_KEY,
          }),
        );
      } catch (error) {
        console.error("[AI][Applications][Intake] Company research failed", {
          requestId,
          company,
          error: serializeError(error),
        });
        companyResearchWarning =
          "Company research could not be completed. You can still import and view the application.";
      }
    }

    const warning =
      title === UNKNOWN_TITLE || company === UNKNOWN_COMPANY
        ? "Some fields were unclear and were set to fallback values."
        : undefined;

    return {
      title,
      company,
      categories,
      companyResearch,
      warning,
      companyResearchWarning,
    };
  } catch (error) {
    console.error("[AI][Applications][Intake] Failed to extract job details", {
      requestId,
      model: model ?? DEFAULT_MODEL,
      maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      jobDescriptionLength: jobDescription.length,
      error: serializeError(error),
    });
    throw new Error("Failed to extract job details");
  }
};
