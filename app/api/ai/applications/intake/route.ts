import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/constants/llm";
import { NextResponse } from "next/server";

const UNKNOWN_TITLE = "Unknown Title";
const UNKNOWN_COMPANY = "Unknown Company";
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const MAX_CATEGORIES = 10;

const requestSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(1, "Job description is required")
    .max(MAX_JOB_DESCRIPTION_LENGTH, "Job description is too long"),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  baseURL: z.string().optional(),
});

const extractionSchema = z.object({
  title: z.string(),
  company: z.string(),
  categories: z.array(z.string()),
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

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause:
        error.cause instanceof Error
          ? {
              name: error.cause.name,
              message: error.cause.message,
            }
          : error.cause,
    };
  }

  return { value: error };
};

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { jobDescription, apiKey, model, maxTokens, baseURL } = parsed.data;
  const resolvedApiKey = apiKey ?? process.env.OPENAI_API_KEY;

  if (!resolvedApiKey) {
    return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 400 });
  }

  try {
    const openai = createOpenAI({
      apiKey: resolvedApiKey,
      baseURL: baseURL || undefined,
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
    const warning =
      title === UNKNOWN_TITLE || company === UNKNOWN_COMPANY
        ? "Some fields were unclear and were set to fallback values."
        : undefined;

    return NextResponse.json({ title, company, categories, warning });
  } catch (error) {
    console.error("[AI][Applications][Intake] Failed to extract job details", {
      requestId,
      model: model ?? DEFAULT_MODEL,
      maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      hasCustomBaseUrl: Boolean(baseURL),
      jobDescriptionLength: jobDescription.length,
      error: serializeError(error),
    });

    return NextResponse.json(
      { error: "Failed to extract job details", requestId },
      { status: 500 },
    );
  }
}
