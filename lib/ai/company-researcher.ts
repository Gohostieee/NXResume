import { Agent, OpenAIProvider, Runner, webSearchTool, withTrace } from "@openai/agents";
import { z } from "zod";

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

export type CompanyResearch = z.infer<typeof companyResearchSchema>;

type CompanyResearchInput = {
  companyName: string;
  shortDescription?: string;
  apiKey: string;
  baseURL?: string | null;
};

const webSearch = webSearchTool({
  userLocation: { type: "approximate" },
  searchContextSize: "medium",
});

const companyResearchAgent = new Agent({
  name: "Company Researcher",
  instructions: [
    "Research the provided company and return a structured company brief.",
    "Use recent, credible sources and keep each section concise.",
    "If information for a section is unavailable, return exactly: No significant information found.",
    "Return output only in the required schema fields.",
  ].join("\n"),
  model: "gpt-5.2",
  tools: [webSearch],
  outputType: companyResearchSchema,
  modelSettings: {
    reasoning: { effort: "medium" },
    store: false,
  },
});

const buildPrompt = ({ companyName, shortDescription }: CompanyResearchInput) => {
  const shortDescriptionLine =
    shortDescription && shortDescription.trim().length > 0
      ? shortDescription.trim()
      : "No short description provided.";

  return [
    `Company Name: ${companyName.trim()}`,
    `Short Description: ${shortDescriptionLine}`,
    "",
    "Return the following sections in structured form:",
    "- companyName",
    "- shortDescription",
    "- companyOverview",
    "- recentEventsNews",
    "- strengthsGoodAspects",
    "- fundingFinancials",
    "- futureOutlook",
    "- missionValues",
    "- otherNotablePoints",
  ].join("\n");
};

export const researchCompany = async (
  input: CompanyResearchInput,
): Promise<CompanyResearch> => {
  const companyName = input.companyName.trim();
  if (!companyName) {
    throw new Error("Company name is required for company research");
  }

  return withTrace("Company research", async () => {
    const runner = new Runner({
      modelProvider: new OpenAIProvider({
        apiKey: input.apiKey,
        baseURL: input.baseURL || undefined,
      }),
    });

    const result = await runner.run(companyResearchAgent, buildPrompt(input));

    if (!result.finalOutput) {
      throw new Error("Company research output is empty");
    }

    return companyResearchSchema.parse(result.finalOutput);
  });
};