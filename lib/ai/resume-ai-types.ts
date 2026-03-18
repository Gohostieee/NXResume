import type { CompanyResearchDetails } from "./application-intake-types";
import type { CareerProfileContext } from "../profile/context";

export type ResumeAiProfileContext = CareerProfileContext;

export type ResumeAiApplicationContext = {
  id?: string;
  title?: string;
  company?: string;
  categories?: string[];
  jobDescription?: string;
  companyResearch?: CompanyResearchDetails;
};

export type ResumeAiEditStrategy = "editor" | "generator";

export type GuidedRunIssue = {
  id: string;
  reasoning: string;
  question: string;
};
