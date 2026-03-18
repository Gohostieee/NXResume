export const UNKNOWN_TITLE = "Unknown Title";
export const UNKNOWN_COMPANY = "Unknown Company";

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
