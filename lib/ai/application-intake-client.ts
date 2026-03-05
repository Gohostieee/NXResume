import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/constants/llm";

type ApplicationIntakeRequest = {
  jobDescription: string;
  apiKey?: string | null;
  model?: string | null;
  maxTokens?: number | null;
  baseURL?: string | null;
};

export type CompanyResearchDetails = {
  companyName: string;
  shortDescription: string;
  companyOverview: string;
  recentEventsNews: string;
  strengthsGoodAspects: string;
  fundingFinancials: string;
  futureOutlook: string;
  missionValues: string;
  otherNotablePoints: string;
};

export type ApplicationIntakeResponse = {
  title: string;
  company: string;
  categories: string[];
  companyResearch?: CompanyResearchDetails;
  warning?: string;
  companyResearchWarning?: string;
};

export const extractApplicationFromDescription = async ({
  jobDescription,
  apiKey,
  model,
  maxTokens,
  baseURL,
}: ApplicationIntakeRequest): Promise<ApplicationIntakeResponse> => {
  const response = await fetch("/api/ai/applications/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobDescription,
      apiKey: apiKey ?? undefined,
      model: model ?? DEFAULT_MODEL,
      maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      baseURL: baseURL ?? undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to extract job details");
  }

  return (await response.json()) as ApplicationIntakeResponse;
};
