export const JOB_SENIORITY_VALUES = [
  "intern",
  "junior",
  "mid_level",
  "senior",
  "staff",
  "principal",
  "c_level",
] as const;

export const EMPLOYMENT_TYPE_VALUES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
] as const;

export type JobSeniority = (typeof JOB_SENIORITY_VALUES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPE_VALUES)[number];

export type JobSearchIntent = {
  simpleQuery?: string;
  locationText?: string;
  remoteOnly?: boolean;
  minSalaryUsd?: number | null;
  postedWithinDays?: number | null;
  seniority?: JobSeniority[];
  employmentTypes?: EmploymentType[];
  filters?: {
    countries?: string[];
    hybrid?: boolean | null;
    titleInclude?: string[];
    titleExclude?: string[];
    locationPatterns?: string[];
    locationExclude?: string[];
    maxSalaryUsd?: number | null;
    technologies?: string[];
    descriptionContains?: string[];
    descriptionExclude?: string[];
    titleRegexAny?: string[];
    titleRegexAll?: string[];
    sourceDomainsInclude?: string[];
    sourceDomainsExclude?: string[];
    easyApply?: boolean | null;
    mustHaveFinalUrl?: boolean;
    mustHaveHiringTeam?: boolean;
    company?: {
      employeeCountMin?: number | null;
      employeeCountMax?: number | null;
      revenueMinUsd?: number | null;
      revenueMaxUsd?: number | null;
      descriptionPatterns?: string[];
    };
  };
  sort?: "newest" | "salary_desc" | "salary_asc";
};

export type JobDateGuard = {
  postedAtMaxAgeDays?: number;
  postedAtGte?: string;
  postedAtLte?: string;
};

export type CompiledTheirStackQuery = {
  payload: Record<string, unknown>;
  normalizedIntent: JobSearchIntent;
  dateGuard: JobDateGuard;
  queryKey: string;
};

export type JobSearchContext = {
  queryHash: string;
  queryKey: string;
  dateGuard: JobDateGuard;
};

export type JobSearchCountResult = {
  estimatedTotal: number;
  estimatedCompanies: number;
  queryHash: string;
  searchContext: JobSearchContext;
};

export type JobSearchPreviewCard = {
  jobId: string;
  title: string;
  companyLabel: string;
  location: string;
  remote: boolean;
  hybrid: boolean;
  salaryLabel: string;
  minSalaryUsd: number | null;
  maxSalaryUsd: number | null;
  seniority: string;
  postedDate: string;
  employmentTypes: string[];
  easyApply: boolean | null;
  hasBlurredData: boolean;
};

export type JobSearchPreviewResult = {
  cards: JobSearchPreviewCard[];
  page: number;
  hasMore: boolean;
  queryHash: string;
  searchContext: JobSearchContext;
};

export type JobHiringTeamMember = {
  fullName: string;
  role: string;
  linkedinUrl: string;
};

export type JobReveal = {
  jobId: string;
  title: string;
  company: string;
  companyDomain: string;
  companyDescription: string;
  location: string;
  remote: boolean;
  hybrid: boolean;
  salaryLabel: string;
  minSalaryUsd: number | null;
  maxSalaryUsd: number | null;
  seniority: string;
  postedDate: string;
  employmentTypes: string[];
  easyApply: boolean | null;
  description: string;
  applyUrl: string;
  sourceUrl: string;
  technologies: string[];
  keywords: string[];
  hiringTeam: JobHiringTeamMember[];
  companyObject?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

export type JobCreditBalance = {
  remainingCredits: number | null;
  apiCreditsRemaining: number | null;
  teamName: string;
  fetchedAt: number;
};

export type JobCreditConsumptionPoint = {
  periodStart: string;
  apiCreditsConsumed: number;
  uiCreditsConsumed: number;
};

export type JobCreditStatus = {
  balance: JobCreditBalance;
  recentConsumption: JobCreditConsumptionPoint[];
};
