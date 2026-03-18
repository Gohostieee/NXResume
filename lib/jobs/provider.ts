import type {
  JobCreditConsumptionPoint,
  JobCreditStatus,
  JobReveal,
  JobSearchCountResult,
  JobSearchContext,
  JobSearchPreviewCard,
  JobSearchPreviewResult,
} from "./types";

type TheirStackSearchResponse = {
  data?: Array<Record<string, unknown>>;
  metadata?: {
    total_results?: number;
    total_companies?: number;
  };
};

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((entry) => normalizeText(entry)).filter(Boolean)
    : [];

const getJobLocation = (job: Record<string, unknown>) =>
  normalizeText(job.location) ||
  normalizeText(job.short_location) ||
  normalizeText(job.long_location);

const getSalaryLabel = (job: Record<string, unknown>) =>
  normalizeText(job.salary_string) ||
  [normalizeNumber(job.min_annual_salary_usd), normalizeNumber(job.max_annual_salary_usd)]
    .filter((entry): entry is number => entry !== null)
    .join(" - ");

export const mapJobPreviewCard = (job: Record<string, unknown>): JobSearchPreviewCard => ({
  jobId: String(job.id ?? ""),
  title: normalizeText(job.job_title) || "Untitled role",
  companyLabel:
    normalizeText(job.company) ||
    normalizeText((job.company_object as Record<string, unknown> | undefined)?.name) ||
    "Hidden company",
  location: getJobLocation(job),
  remote: job.remote === true,
  hybrid: job.hybrid === true,
  salaryLabel: getSalaryLabel(job),
  minSalaryUsd: normalizeNumber(job.min_annual_salary_usd),
  maxSalaryUsd: normalizeNumber(job.max_annual_salary_usd),
  seniority: normalizeText(job.seniority),
  postedDate: normalizeText(job.date_posted),
  employmentTypes: normalizeStringArray(job.employment_statuses),
  easyApply: typeof job.easy_apply === "boolean" ? job.easy_apply : null,
  hasBlurredData: job.has_blurred_data === true,
});

export const mapCountResult = (
  response: TheirStackSearchResponse,
  queryHash: string,
  searchContext: JobSearchContext,
): JobSearchCountResult => ({
  estimatedTotal: response.metadata?.total_results ?? 0,
  estimatedCompanies: response.metadata?.total_companies ?? 0,
  queryHash,
  searchContext,
});

export const mapPreviewResult = (
  response: TheirStackSearchResponse,
  page: number,
  queryHash: string,
  searchContext: JobSearchContext,
  pageSize: number,
): JobSearchPreviewResult => {
  const cards = (response.data ?? []).map((job) => mapJobPreviewCard(job));

  return {
    cards,
    page,
    hasMore: cards.length === pageSize,
    queryHash,
    searchContext,
  };
};

export const mapRevealResult = (job: Record<string, unknown>): JobReveal => {
  const companyObject =
    job.company_object && typeof job.company_object === "object"
      ? (job.company_object as Record<string, unknown>)
      : undefined;
  const hiringTeam = Array.isArray(job.hiring_team)
    ? job.hiring_team
        .map((member) => (member && typeof member === "object" ? member : null))
        .filter((member): member is Record<string, unknown> => Boolean(member))
        .map((member) => ({
          fullName: normalizeText(member.full_name),
          role: normalizeText(member.role),
          linkedinUrl: normalizeText(member.linkedin_url),
        }))
    : [];

  return {
    jobId: String(job.id ?? ""),
    title: normalizeText(job.job_title) || "Untitled role",
    company:
      normalizeText(job.company) || normalizeText(companyObject?.name) || "Unknown company",
    companyDomain:
      normalizeText(job.company_domain) || normalizeText(companyObject?.domain),
    companyDescription:
      normalizeText(companyObject?.long_description) ||
      normalizeText(companyObject?.seo_description),
    location: getJobLocation(job),
    remote: job.remote === true,
    hybrid: job.hybrid === true,
    salaryLabel: getSalaryLabel(job),
    minSalaryUsd: normalizeNumber(job.min_annual_salary_usd),
    maxSalaryUsd: normalizeNumber(job.max_annual_salary_usd),
    seniority: normalizeText(job.seniority),
    postedDate: normalizeText(job.date_posted),
    employmentTypes: normalizeStringArray(job.employment_statuses),
    easyApply: typeof job.easy_apply === "boolean" ? job.easy_apply : null,
    description: normalizeText(job.description),
    applyUrl:
      normalizeText(job.final_url) ||
      normalizeText(job.url) ||
      normalizeText(job.source_url),
    sourceUrl: normalizeText(job.source_url),
    technologies: normalizeStringArray(job.technology_slugs),
    keywords: normalizeStringArray(job.keyword_slugs),
    hiringTeam,
    companyObject,
    raw: job,
  };
};

export const mapCreditStatus = (
  balanceResponse: Record<string, unknown>,
  consumptionResponse: Array<Record<string, unknown>>,
): JobCreditStatus => ({
  balance: {
    remainingCredits:
      normalizeNumber(balanceResponse.api_credits_remaining) ??
      normalizeNumber(balanceResponse.credits_remaining) ??
      normalizeNumber(balanceResponse.remaining_credits),
    apiCreditsRemaining: normalizeNumber(balanceResponse.api_credits_remaining),
    teamName: normalizeText(balanceResponse.team_name),
    fetchedAt: Date.now(),
  },
  recentConsumption: consumptionResponse.map(
    (entry): JobCreditConsumptionPoint => ({
      periodStart: normalizeText(entry.period_start),
      apiCreditsConsumed: normalizeNumber(entry.api_credits_consumed) ?? 0,
      uiCreditsConsumed: normalizeNumber(entry.ui_credits_consumed) ?? 0,
    }),
  ),
});
