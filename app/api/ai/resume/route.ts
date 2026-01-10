import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/constants/llm";
import { resumeEditSchema } from "@/lib/ai/resume-edit-schema";
import { resumeEditorGuide } from "@/lib/ai/resume-editor-guide";
import { NextResponse } from "next/server";

const profileSchema = z
  .object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    headline: z.string().optional(),
    currentTitle: z.string().optional(),
    yearsOfExperience: z.string().optional(),
    websiteLinks: z.array(z.string()).optional(),
    socialLinks: z.array(z.string()).optional(),
    summary: z.string().optional(),
    experience: z
      .array(
        z.object({
          id: z.string().optional(),
          company: z.string().optional(),
          title: z.string().optional(),
          location: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          summary: z.string().optional(),
          highlights: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    workAuthorization: z.string().optional(),
    desiredRoles: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
    achievements: z.string().optional(),
    education: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    portfolioLinks: z.array(z.string()).optional(),
    targetCompanies: z.array(z.string()).optional(),
    jobTypes: z.array(z.string()).optional(),
    workArrangement: z.string().optional(),
    relocation: z.boolean().optional(),
    salaryRange: z.string().optional(),
    availability: z.string().optional(),
    additionalContext: z.string().optional(),
  })
  .optional();

const requestSchema = z.object({
  instruction: z.string().min(1),
  resume: resumeEditSchema,
  profile: profileSchema,
  apiKey: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  baseURL: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { instruction, resume, profile, apiKey, model, maxTokens, baseURL } = parsed.data;
  const resolvedApiKey = apiKey ?? process.env.OPENAI_API_KEY;

  if (!resolvedApiKey) {
    return NextResponse.json(
      { error: "Missing OpenAI API key" },
      { status: 400 },
    );
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
      "User instruction:",
      instruction,
      "",
      "Return the full updated ResumeData JSON only.",
    ].join("\n"),
    temperature: 0.2,
    maxOutputTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
  });

  return NextResponse.json({ resume: result.object });
}
