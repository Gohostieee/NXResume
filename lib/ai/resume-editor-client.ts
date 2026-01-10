import type { ResumeData } from "@/lib/schema";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/constants/llm";

type ResumeEditRequest = {
  resume: ResumeData;
  instruction: string;
  profile?: unknown;
  apiKey?: string | null;
  model?: string | null;
  maxTokens?: number | null;
  baseURL?: string | null;
};

export const editResumeWithAi = async ({
  resume,
  instruction,
  profile,
  apiKey,
  model,
  maxTokens,
  baseURL,
}: ResumeEditRequest): Promise<ResumeData> => {
  const response = await fetch("/api/ai/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume,
      instruction,
      profile: profile ?? undefined,
      apiKey: apiKey ?? undefined,
      model: model ?? DEFAULT_MODEL,
      maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      baseURL: baseURL ?? undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to edit resume");
  }

  const data = (await response.json()) as { resume: ResumeData };
  return data.resume;
};
