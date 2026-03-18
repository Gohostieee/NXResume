import type {
  CompiledTheirStackQuery,
  JobDateGuard,
  JobSearchContext,
  JobSearchIntent,
} from "./types";

const DEFAULT_POSTED_WITHIN_DAYS = 30;
export const JOBS_PAGE_SIZE = 20;

const UNSUPPORTED_COMPANY_FILTER_KEYS = new Set([
  "company_name_or",
  "company_name_case_insensitive_or",
  "company_domain_or",
  "company_linkedin_url_or",
  "company_id_or",
  "company_name",
  "company_domain",
  "company_linkedin_url",
  "company_id",
]);

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeStringArray = (value: unknown) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => normalizeText(entry))
        .filter(Boolean),
    ),
  );

const normalizeBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : null;

const normalizeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const pruneEmptyValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const next = value
      .map((entry) => pruneEmptyValues(entry))
      .filter(
        (entry) =>
          entry !== undefined &&
          entry !== null &&
          !(Array.isArray(entry) && entry.length === 0) &&
          !(typeof entry === "object" && entry !== null && Object.keys(entry).length === 0),
      );
    return next;
  }

  if (value && typeof value === "object") {
    const nextEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, pruneEmptyValues(entry)] as const)
      .filter(
        ([, entry]) =>
          entry !== undefined &&
          entry !== null &&
          !(Array.isArray(entry) && entry.length === 0) &&
          !(typeof entry === "object" && entry !== null && Object.keys(entry).length === 0),
      );

    return Object.fromEntries(nextEntries);
  }

  return value;
};

const assertNoUnsupportedCompanyFilters = (value: unknown): void => {
  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (UNSUPPORTED_COMPANY_FILTER_KEYS.has(key)) {
      if (
        (Array.isArray(nested) && nested.length > 0) ||
        (typeof nested === "string" && nested.trim().length > 0) ||
        (nested && typeof nested === "object")
      ) {
        throw new Error("Exact company identifier filters are disabled in v1 job search.");
      }
    }

    assertNoUnsupportedCompanyFilters(nested);
  }
};

export const normalizeJobSearchIntent = (input: unknown): JobSearchIntent => {
  assertNoUnsupportedCompanyFilters(input);

  const source = (input ?? {}) as Record<string, unknown>;
  const filters = ((source.filters ?? {}) as Record<string, unknown>) || {};
  const company = ((filters.company ?? {}) as Record<string, unknown>) || {};

  return pruneEmptyValues({
    simpleQuery: normalizeText(source.simpleQuery),
    locationText: normalizeText(source.locationText),
    remoteOnly: source.remoteOnly === true,
    minSalaryUsd: normalizeNumber(source.minSalaryUsd),
    postedWithinDays:
      normalizeNumber(source.postedWithinDays) ?? DEFAULT_POSTED_WITHIN_DAYS,
    seniority: normalizeStringArray(source.seniority),
    employmentTypes: normalizeStringArray(source.employmentTypes),
    filters: {
      countries: normalizeStringArray(filters.countries).map((entry) => entry.toUpperCase()),
      hybrid: normalizeBoolean(filters.hybrid),
      titleInclude: normalizeStringArray(filters.titleInclude),
      titleExclude: normalizeStringArray(filters.titleExclude),
      locationPatterns: normalizeStringArray(filters.locationPatterns),
      locationExclude: normalizeStringArray(filters.locationExclude),
      maxSalaryUsd: normalizeNumber(filters.maxSalaryUsd),
      technologies: normalizeStringArray(filters.technologies),
      descriptionContains: normalizeStringArray(filters.descriptionContains),
      descriptionExclude: normalizeStringArray(filters.descriptionExclude),
      titleRegexAny: normalizeStringArray(filters.titleRegexAny),
      titleRegexAll: normalizeStringArray(filters.titleRegexAll),
      sourceDomainsInclude: normalizeStringArray(filters.sourceDomainsInclude),
      sourceDomainsExclude: normalizeStringArray(filters.sourceDomainsExclude),
      easyApply: normalizeBoolean(filters.easyApply),
      mustHaveFinalUrl: filters.mustHaveFinalUrl === true,
      mustHaveHiringTeam: filters.mustHaveHiringTeam === true,
      company: {
        employeeCountMin: normalizeNumber(company.employeeCountMin),
        employeeCountMax: normalizeNumber(company.employeeCountMax),
        revenueMinUsd: normalizeNumber(company.revenueMinUsd),
        revenueMaxUsd: normalizeNumber(company.revenueMaxUsd),
        descriptionPatterns: normalizeStringArray(company.descriptionPatterns),
      },
    },
    sort:
      source.sort === "salary_desc" || source.sort === "salary_asc"
        ? source.sort
        : "newest",
  }) as JobSearchIntent;
};

const buildPropertyExistsAnd = (intent: JobSearchIntent) => {
  const required: string[] = [];

  if (intent.filters?.mustHaveFinalUrl) required.push("final_url");
  if (intent.filters?.mustHaveHiringTeam) required.push("hiring_team");

  return required;
};

const buildDateGuard = (intent: JobSearchIntent): JobDateGuard => ({
  postedAtMaxAgeDays: intent.postedWithinDays ?? DEFAULT_POSTED_WITHIN_DAYS,
});

const buildBaseSearchPayload = (intent: JobSearchIntent) => {
  const titleOr = [
    ...(intent.simpleQuery ? [intent.simpleQuery] : []),
    ...(intent.filters?.titleInclude ?? []),
  ];
  const locationPatterns = [
    ...(intent.locationText ? [intent.locationText] : []),
    ...(intent.filters?.locationPatterns ?? []),
  ];
  const propertyExistsAnd = buildPropertyExistsAnd(intent);
  const descriptionContains = [...(intent.filters?.descriptionContains ?? [])];

  if (intent.filters?.hybrid) {
    descriptionContains.push("hybrid");
  }

  return pruneEmptyValues({
    job_title_or: titleOr,
    job_title_not: intent.filters?.titleExclude,
    job_title_pattern_or: intent.filters?.titleRegexAny,
    job_title_pattern_and: intent.filters?.titleRegexAll,
    job_country_code_or: intent.filters?.countries,
    job_location_pattern_or: locationPatterns,
    job_location_pattern_not: intent.filters?.locationExclude,
    posted_at_max_age_days: intent.postedWithinDays ?? DEFAULT_POSTED_WITHIN_DAYS,
    remote: intent.remoteOnly ? true : undefined,
    employment_statuses_or: intent.employmentTypes,
    job_seniority_or: intent.seniority,
    min_salary_usd: intent.minSalaryUsd ?? undefined,
    max_salary_usd: intent.filters?.maxSalaryUsd ?? undefined,
    job_technology_slug_or: intent.filters?.technologies,
    property_exists_and: propertyExistsAnd,
    job_description_contains_or: descriptionContains,
    job_description_contains_not: intent.filters?.descriptionExclude,
    url_domain_or: intent.filters?.sourceDomainsInclude,
    url_domain_not: intent.filters?.sourceDomainsExclude,
    easy_apply: intent.filters?.easyApply,
    min_employee_count: intent.filters?.company?.employeeCountMin ?? undefined,
    max_employee_count: intent.filters?.company?.employeeCountMax ?? undefined,
    min_revenue_usd: intent.filters?.company?.revenueMinUsd ?? undefined,
    max_revenue_usd: intent.filters?.company?.revenueMaxUsd ?? undefined,
    company_description_pattern_or: intent.filters?.company?.descriptionPatterns,
  }) as Record<string, unknown>;
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

export const buildJobSearchContext = (
  queryHash: string,
  compiledQuery: CompiledTheirStackQuery,
): JobSearchContext => ({
  queryHash,
  queryKey: compiledQuery.queryKey,
  dateGuard: compiledQuery.dateGuard,
});

export const compileJobCountQuery = (input: unknown): CompiledTheirStackQuery => {
  const normalizedIntent = normalizeJobSearchIntent(input);
  const payload = {
    ...buildBaseSearchPayload(normalizedIntent),
    blur_company_data: true,
    include_total_results: true,
    limit: 1,
    page: 0,
  };

  return {
    payload,
    normalizedIntent,
    dateGuard: buildDateGuard(normalizedIntent),
    queryKey: stableStringify(payload),
  };
};

export const compileJobPreviewQuery = (
  input: unknown,
  page: number,
): CompiledTheirStackQuery => {
  const normalizedIntent = normalizeJobSearchIntent(input);
  const payload = {
    ...buildBaseSearchPayload(normalizedIntent),
    blur_company_data: true,
    include_total_results: false,
    limit: JOBS_PAGE_SIZE,
    page,
  };

  return {
    payload,
    normalizedIntent,
    dateGuard: buildDateGuard(normalizedIntent),
    queryKey: stableStringify(payload),
  };
};

export const compileJobRevealQuery = (
  jobId: string | number,
  context: unknown,
): CompiledTheirStackQuery => {
  const sourceContext = (context ?? {}) as JobSearchContext;
  const numericId = typeof jobId === "number" ? jobId : Number(jobId);

  if (!Number.isFinite(numericId)) {
    throw new Error("A valid job id is required to reveal a job.");
  }

  const dateGuard = pruneEmptyValues({
    posted_at_max_age_days: sourceContext.dateGuard?.postedAtMaxAgeDays,
    posted_at_gte: sourceContext.dateGuard?.postedAtGte,
    posted_at_lte: sourceContext.dateGuard?.postedAtLte,
  }) as Record<string, unknown>;

  if (Object.keys(dateGuard).length === 0) {
    throw new Error("Search context is missing its required date guard.");
  }

  const payload = {
    ...dateGuard,
    job_id_or: [numericId],
    blur_company_data: false,
    include_total_results: false,
    limit: 1,
    page: 0,
  };

  return {
    payload,
    normalizedIntent: {},
    dateGuard: {
      postedAtMaxAgeDays:
        typeof dateGuard.posted_at_max_age_days === "number"
          ? (dateGuard.posted_at_max_age_days as number)
          : undefined,
      postedAtGte:
        typeof dateGuard.posted_at_gte === "string"
          ? (dateGuard.posted_at_gte as string)
          : undefined,
      postedAtLte:
        typeof dateGuard.posted_at_lte === "string"
          ? (dateGuard.posted_at_lte as string)
          : undefined,
    },
    queryKey: stableStringify(payload),
  };
};
