"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import {
  ArrowSquareOut,
  Briefcase,
  Buildings,
  Clock,
  Copy,
  FunnelSimple,
  MagnifyingGlass,
  MapPin,
  Money,
  Sparkle,
  SpinnerGap,
} from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type {
  EmploymentType,
  JobCreditStatus,
  JobReveal,
  JobSearchContext,
  JobSearchIntent,
  JobSearchPreviewCard,
  JobSeniority,
} from "@/lib/jobs/types";
import { useBreakpoint } from "@/lib/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_POSTED_WITHIN_DAYS = 30;

const seniorityOptions: Array<{ value: JobSeniority; label: string }> = [
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior" },
  { value: "mid_level", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "principal", label: "Principal" },
  { value: "c_level", label: "C-level" },
];

const employmentTypeOptions: Array<{ value: EmploymentType; label: string }> = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];

type Notice = {
  variant: "success" | "error" | "info";
  title: string;
  description: string;
  href?: string;
};

const emptyIntent = (): JobSearchIntent => ({
  simpleQuery: "",
  locationText: "",
  remoteOnly: false,
  minSalaryUsd: null,
  postedWithinDays: DEFAULT_POSTED_WITHIN_DAYS,
  seniority: [],
  employmentTypes: [],
  sort: "newest",
  filters: {
    countries: [],
    hybrid: null,
    titleInclude: [],
    titleExclude: [],
    locationPatterns: [],
    locationExclude: [],
    maxSalaryUsd: null,
    technologies: [],
    descriptionContains: [],
    descriptionExclude: [],
    titleRegexAny: [],
    titleRegexAll: [],
    sourceDomainsInclude: [],
    sourceDomainsExclude: [],
    easyApply: null,
    mustHaveFinalUrl: false,
    mustHaveHiringTeam: false,
    company: {
      employeeCountMin: null,
      employeeCountMax: null,
      revenueMinUsd: null,
      revenueMaxUsd: null,
      descriptionPatterns: [],
    },
  },
});

const parseCsv = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

const serializeCsv = (value?: string[] | null) => (value ?? []).join(", ");

const parseSalaryFloor = (value?: string | null) => {
  if (!value) return null;

  const normalized = value.replace(/,/g, "").toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)(k)?/);
  if (!match) return null;

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;

  return match[2] ? Math.round(base * 1_000) : Math.round(base);
};

const mapProfileEmploymentTypes = (jobTypes: string[] = []): EmploymentType[] =>
  jobTypes
    .map((entry) => entry.toLowerCase())
    .flatMap((entry) => {
      if (entry.includes("full")) return ["full_time" as const];
      if (entry.includes("part")) return ["part_time" as const];
      if (entry.includes("contract")) return ["contract" as const];
      if (entry.includes("intern")) return ["internship" as const];
      if (entry.includes("temp")) return ["temporary" as const];
      return [];
    });

const buildProfilePrefill = (profileContext: any): JobSearchIntent => {
  const intent = emptyIntent();
  intent.simpleQuery =
    profileContext?.derived?.primaryTargetRole ||
    profileContext?.profile?.desiredRoles?.[0] ||
    "";
  intent.locationText = profileContext?.profile?.location ?? "";
  intent.remoteOnly = profileContext?.profile?.workArrangement === "Remote";
  intent.minSalaryUsd = parseSalaryFloor(profileContext?.profile?.salaryRange);
  intent.employmentTypes = mapProfileEmploymentTypes(profileContext?.profile?.jobTypes);
  intent.filters = {
    ...intent.filters,
    hybrid: profileContext?.profile?.workArrangement === "Hybrid" ? true : null,
  };
  return intent;
};

const formatCurrency = (value: number | null | undefined) => {
  if (!value || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatSalary = (card: { salaryLabel?: string; minSalaryUsd?: number | null; maxSalaryUsd?: number | null }) => {
  if (card.salaryLabel) return card.salaryLabel;
  const min = formatCurrency(card.minSalaryUsd);
  const max = formatCurrency(card.maxSalaryUsd);
  if (min && max) return `${min} - ${max}`;
  return min || max || "Salary not listed";
};

const formatPostedDate = (value?: string) => {
  if (!value) return "Unknown date";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Date(timestamp).toLocaleDateString();
};

const activeFilterSummary = (intent: JobSearchIntent) => {
  const filters: string[] = [];

  if (intent.simpleQuery) filters.push(`Role: ${intent.simpleQuery}`);
  if (intent.locationText) filters.push(`Location: ${intent.locationText}`);
  if (intent.remoteOnly) filters.push("Remote only");
  if (intent.minSalaryUsd) filters.push(`Min salary: ${formatCurrency(intent.minSalaryUsd)}`);
  if (intent.postedWithinDays) filters.push(`Posted within ${intent.postedWithinDays} days`);
  if ((intent.seniority?.length ?? 0) > 0) filters.push(`Seniority: ${intent.seniority?.join(", ")}`);
  if ((intent.employmentTypes?.length ?? 0) > 0) {
    filters.push(`Employment: ${intent.employmentTypes?.join(", ")}`);
  }
  if ((intent.filters?.technologies?.length ?? 0) > 0) {
    filters.push(`Tech: ${intent.filters?.technologies?.slice(0, 3).join(", ")}`);
  }
  if ((intent.filters?.countries?.length ?? 0) > 0) {
    filters.push(`Countries: ${intent.filters?.countries?.join(", ")}`);
  }
  if (intent.filters?.hybrid) filters.push("Hybrid mention");
  if (intent.filters?.easyApply === true) filters.push("Easy apply");
  if (intent.filters?.mustHaveFinalUrl) filters.push("Has final apply URL");
  if (intent.filters?.mustHaveHiringTeam) filters.push("Has hiring team");

  return filters;
};

const setNumberValue = (value: string) => {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function ArrayField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value?: string[] | null;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Textarea
        value={serializeCsv(value)}
        onChange={(event) => onChange(parseCsv(event.target.value))}
        rows={3}
        placeholder="Comma or line separated"
      />
      {helper ? <p className="text-xs text-foreground/60">{helper}</p> : null}
    </div>
  );
}

function PreviewCard({
  card,
  onReveal,
}: {
  card: JobSearchPreviewCard;
  onReveal: (jobId: string) => void;
}) {
  return (
    <Card className="rounded-2xl border-border/70 p-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-tight">{card.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground/65">
              <span className="inline-flex items-center gap-1">
                <Buildings className="h-4 w-4" />
                {card.companyLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {card.location || "Location unknown"}
              </span>
            </div>
          </div>
          <Badge variant="secondary" outline>
            Preview
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={card.remote ? "info" : "secondary"} outline>
            {card.remote ? "Remote" : "Not marked remote"}
          </Badge>
          {card.hybrid ? (
            <Badge variant="secondary" outline>
              Hybrid
            </Badge>
          ) : null}
          {card.seniority ? (
            <Badge variant="secondary" outline>
              {card.seniority}
            </Badge>
          ) : null}
          {card.easyApply === true ? (
            <Badge variant="success" outline>
              Easy apply
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-3 text-sm text-foreground/75 sm:grid-cols-2">
          <div className="inline-flex items-center gap-2">
            <Money className="h-4 w-4" />
            {formatSalary(card)}
          </div>
          <div className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Posted {formatPostedDate(card.postedDate)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div className="text-xs text-foreground/60">
            Browsing previews is free. Reveal only when this looks worth it.
          </div>
          <Button onClick={() => onReveal(card.jobId)}>Reveal details</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JobsPage() {
  const profileContext = useQuery(api.careerProfiles.getContext);
  const countJobs = useAction(api.jobs.count);
  const previewJobs = useAction(api.jobs.preview);
  const revealJob = useAction(api.jobs.reveal);
  const getCreditStatus = useAction(api.jobs.getCreditStatus);
  const importToApplications = useAction(api.jobs.importToApplications);
  const { isMobile } = useBreakpoint();

  const requestIdRef = useRef(0);
  const prefilledRef = useRef(false);

  const [intent, setIntent] = useState<JobSearchIntent>(() => emptyIntent());
  const [advancedDraft, setAdvancedDraft] = useState<JobSearchIntent["filters"]>(() => emptyIntent().filters);
  const [isReady, setIsReady] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [isCounting, setIsCounting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewCards, setPreviewCards] = useState<JobSearchPreviewCard[]>([]);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [searchContext, setSearchContext] = useState<JobSearchContext | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [creditStatus, setCreditStatus] = useState<JobCreditStatus | null>(null);
  const [isLoadingCreditStatus, setIsLoadingCreditStatus] = useState(false);

  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealedJob, setRevealedJob] = useState<JobReveal | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const activeFilters = useMemo(() => activeFilterSummary(intent), [intent]);

  useEffect(() => {
    if (prefilledRef.current) return;
    if (profileContext === undefined) return;

    if (profileContext) {
      const prefills = buildProfilePrefill(profileContext);
      setIntent(prefills);
      setAdvancedDraft(prefills.filters ?? emptyIntent().filters);
    }

    prefilledRef.current = true;
    setIsReady(true);
  }, [profileContext]);

  useEffect(() => {
    if (!isReady) return;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        setIsCounting(true);
        setIsLoadingPage(true);
        setSearchError(null);

        try {
          const countResult = await countJobs({ intent });

          if (requestId !== requestIdRef.current) return;

          setEstimatedTotal(countResult.estimatedTotal);
          setSearchContext(countResult.searchContext);

          if (countResult.estimatedTotal === 0) {
            setPreviewCards([]);
            setPage(0);
            setHasMore(false);
            return;
          }

          const previewResult = await previewJobs({ intent, page: 0 });
          if (requestId !== requestIdRef.current) return;

          setPreviewCards(previewResult.cards);
          setPage(previewResult.page);
          setHasMore(previewResult.hasMore);
          setSearchContext(previewResult.searchContext);
        } catch (error) {
          if (requestId !== requestIdRef.current) return;

          setPreviewCards([]);
          setEstimatedTotal(0);
          setHasMore(false);
          setSearchError(error instanceof Error ? error.message : "Search failed.");
        } finally {
          if (requestId === requestIdRef.current) {
            setIsCounting(false);
            setIsLoadingPage(false);
          }
        }
      })();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [countJobs, intent, isReady, previewJobs]);

  useEffect(() => {
    if (!isReady) return;

    void (async () => {
      setIsLoadingCreditStatus(true);
      try {
        const result = await getCreditStatus({});
        setCreditStatus(result);
      } catch {
        setCreditStatus(null);
      } finally {
        setIsLoadingCreditStatus(false);
      }
    })();
  }, [getCreditStatus, isReady]);

  const updateIntent = (updates: Partial<JobSearchIntent>) => {
    setIntent((current) => ({
      ...current,
      ...updates,
    }));
  };

  const updateFilters = (updates: Partial<NonNullable<JobSearchIntent["filters"]>>) => {
    setIntent((current) => ({
      ...current,
      filters: {
        ...(current.filters ?? emptyIntent().filters),
        ...updates,
        company: {
          ...(current.filters?.company ?? emptyIntent().filters?.company),
          ...(updates.company ?? {}),
        },
      },
    }));
  };

  const clearFilters = () => {
    const next = emptyIntent();
    setIntent(next);
    setAdvancedDraft(next.filters);
    setNotice(null);
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setSearchError(null);

    try {
      const nextPage = page + 1;
      const previewResult = await previewJobs({ intent, page: nextPage });
      setPreviewCards((current) => [...current, ...previewResult.cards]);
      setPage(previewResult.page);
      setHasMore(previewResult.hasMore);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not load more jobs.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openReveal = async (jobId: string) => {
    if (!searchContext) return;

    setIsRevealOpen(true);
    setIsRevealing(true);
    setRevealError(null);

    try {
      const result = await revealJob({
        jobId,
        searchContext,
      });
      setRevealedJob(result);

      try {
        const nextCreditStatus = await getCreditStatus({});
        setCreditStatus(nextCreditStatus);
      } catch {
        // Credit refresh is non-blocking.
      }
    } catch (error) {
      setRevealError(error instanceof Error ? error.message : "Could not reveal this job.");
      setRevealedJob(null);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopyDescription = async () => {
    if (!revealedJob?.description) return;

    try {
      await navigator.clipboard.writeText(revealedJob.description);
      setNotice({
        variant: "info",
        title: "Description copied",
        description: "The full job description is now in your clipboard.",
      });
    } catch {
      setNotice({
        variant: "error",
        title: "Copy failed",
        description: "Clipboard access was not available in this browser context.",
      });
    }
  };

  const handleImport = async () => {
    if (!revealedJob || !searchContext) return;

    setIsImporting(true);
    try {
      const result = await importToApplications({
        revealedJob,
        searchContext,
      });

      setNotice({
        variant:
          result.created && !result.queuedExtraction
            ? "error"
            : result.created
              ? "success"
              : "info",
        title:
          result.created && !result.queuedExtraction
            ? "Imported with extraction issue"
            : result.created
              ? "Added to Applications"
              : "Already in Applications",
        description:
          result.created && !result.queuedExtraction
            ? "The job was imported, but AI extraction could not be queued. Open the application to retry extraction."
            : result.created
              ? "The role was imported and AI extraction is running in the background."
              : "This role already exists in your applications tracker.",
        href: result.href,
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Import failed",
        description: error instanceof Error ? error.message : "Could not import this job.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,244,245,0.92))] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
              <Sparkle className="h-3.5 w-3.5" />
              Free preview, pay on reveal
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Jobs</h1>
            <p className="mt-2 max-w-xl text-sm text-foreground/70">
              Search TheirStack without burning credits while you refine. Browse blurred previews for free,
              reveal one job at a time, and send the good ones straight into Applications.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-foreground/50">Matches</div>
              <div className="mt-1 text-2xl font-semibold">
                {isCounting ? "..." : estimatedTotal.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-foreground/50">Active Filters</div>
              <div className="mt-1 text-2xl font-semibold">{activeFilters.length}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-foreground/50">Credits Left</div>
              <div className="mt-1 text-2xl font-semibold">
                {isLoadingCreditStatus ? "..." : creditStatus?.balance.remainingCredits ?? "--"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {activeFilters.length > 0 ? (
            activeFilters.map((entry) => (
              <Badge key={entry} variant="secondary" outline>
                {entry}
              </Badge>
            ))
          ) : (
            <Badge variant="secondary" outline>
              No filters yet
            </Badge>
          )}
        </div>
      </div>

      {notice && (
        <Alert>
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <div>{notice.description}</div>
              {notice.href ? (
                <Link href={notice.href} className="inline-flex items-center gap-1 underline">
                  Open in Applications
                  <ArrowSquareOut className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {searchError && (
        <Alert variant="error">
          <AlertTitle>Search failed</AlertTitle>
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="rounded-3xl border-border/70 bg-background/95 p-0">
          <CardHeader className="border-b border-border/70 p-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <MagnifyingGlass className="h-5 w-5" />
              Search
            </CardTitle>
            <CardDescription>
              Simple filters debounce automatically. Advanced filters stay local until you apply them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-2">
              <Label htmlFor="simple-query">Job title / keywords</Label>
              <Input
                id="simple-query"
                value={intent.simpleQuery ?? ""}
                placeholder="Staff frontend engineer"
                onChange={(event) => updateIntent({ simpleQuery: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location-text">Location</Label>
              <Input
                id="location-text"
                value={intent.locationText ?? ""}
                placeholder="Remote, New York, US"
                onChange={(event) => updateIntent({ locationText: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="salary-min">Minimum salary (USD)</Label>
              <Input
                id="salary-min"
                type="number"
                min={0}
                value={intent.minSalaryUsd ?? ""}
                placeholder="150000"
                onChange={(event) => updateIntent({ minSalaryUsd: setNumberValue(event.target.value) })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Posted within</Label>
              <Select
                value={String(intent.postedWithinDays ?? DEFAULT_POSTED_WITHIN_DAYS)}
                onValueChange={(value) => updateIntent({ postedWithinDays: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Seniority</Label>
              <Select
                value={intent.seniority?.[0] ?? "any"}
                onValueChange={(value) =>
                  updateIntent({ seniority: value === "any" ? [] : [value as JobSeniority] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any seniority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any seniority</SelectItem>
                  {seniorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Employment type</Label>
              <Select
                value={intent.employmentTypes?.[0] ?? "any"}
                onValueChange={(value) =>
                  updateIntent({
                    employmentTypes: value === "any" ? [] : [value as EmploymentType],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {employmentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
              <div>
                <div className="font-medium">Remote only</div>
                <div className="text-xs text-foreground/60">Maps to the provider remote flag.</div>
              </div>
              <Switch
                checked={intent.remoteOnly === true}
                onCheckedChange={(checked) => updateIntent({ remoteOnly: checked })}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdvancedDraft(intent.filters ?? emptyIntent().filters);
                  setIsAdvancedOpen(true);
                }}
              >
                <FunnelSimple className="mr-2 h-4 w-4" />
                Advanced Filters
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-border/70 p-0">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Results</div>
                  <div className="mt-1 text-sm text-foreground/70">
                    Browsing previews is free. Revealing details uses 1 credit per job.
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm">
                  {isCounting || isLoadingPage
                    ? "Refreshing previews..."
                    : `${estimatedTotal.toLocaleString()} total matches`}
                </div>
              </div>
            </CardContent>
          </Card>
          {isLoadingPage ? (
            <Card className="rounded-3xl border-dashed border-border/70">
              <CardContent className="flex items-center gap-3 p-6 text-sm text-foreground/70">
                <SpinnerGap className="h-5 w-5 animate-spin" />
                Loading free previews...
              </CardContent>
            </Card>
          ) : previewCards.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-border/70">
              <CardContent className="space-y-3 p-8 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-foreground/35" />
                <div className="text-lg font-semibold">No preview jobs yet</div>
                <div className="text-sm text-foreground/65">
                  Adjust your search criteria and the preview list will update automatically.
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {previewCards.map((card) => (
                  <PreviewCard key={`${card.jobId}-${card.postedDate}`} card={card} onReveal={openReveal} />
                ))}
              </div>

              <div className="flex justify-center">
                <Button type="button" variant="outline" disabled={!hasMore || isLoadingMore} onClick={loadMore}>
                  {isLoadingMore ? (
                    <>
                      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                      Loading more
                    </>
                  ) : hasMore ? (
                    "Load more previews"
                  ) : (
                    "No more previews"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Sheet open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Advanced Search</SheetTitle>
            <SheetDescription>
              These edits stay local until you apply them. Exact company identifier filters remain disabled in v1.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 pb-6">
            <Card className="p-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Role Filters</CardTitle>
                <CardDescription>Inclusion, exclusion, regex, and role-specific narrowing.</CardDescription>
              </CardHeader>
              <CardContent className="mt-4 grid gap-4 p-0">
                <ArrayField
                  label="Include titles"
                  value={advancedDraft?.titleInclude}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), titleInclude: next }))}
                />
                <ArrayField
                  label="Exclude titles"
                  value={advancedDraft?.titleExclude}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), titleExclude: next }))}
                />
                <ArrayField
                  label="Title regex (any)"
                  value={advancedDraft?.titleRegexAny}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), titleRegexAny: next }))}
                />
                <ArrayField
                  label="Title regex (all)"
                  value={advancedDraft?.titleRegexAll}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), titleRegexAll: next }))}
                />
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Location & Work Style</CardTitle>
                <CardDescription>Country codes, location patterns, and hybrid hints.</CardDescription>
              </CardHeader>
              <CardContent className="mt-4 grid gap-4 p-0">
                <ArrayField
                  label="Countries"
                  helper="Use ISO country codes such as US, CA, GB."
                  value={advancedDraft?.countries}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), countries: next.map((entry) => entry.toUpperCase()) }))}
                />
                <ArrayField
                  label="Location patterns"
                  value={advancedDraft?.locationPatterns}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), locationPatterns: next }))}
                />
                <ArrayField
                  label="Exclude locations"
                  value={advancedDraft?.locationExclude}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), locationExclude: next }))}
                />
                <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
                  <div>
                    <div className="font-medium">Hybrid mention</div>
                    <div className="text-xs text-foreground/60">Provider has no direct hybrid filter, so this searches for hybrid language in descriptions.</div>
                  </div>
                  <Switch
                    checked={advancedDraft?.hybrid === true}
                    onCheckedChange={(checked) => setAdvancedDraft((current) => ({ ...(current ?? {}), hybrid: checked ? true : null }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Compensation</CardTitle>
                <CardDescription>Set upper salary bounds when you want a narrower band.</CardDescription>
              </CardHeader>
              <CardContent className="mt-4 grid gap-4 p-0 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="max-salary">Maximum salary (USD)</Label>
                  <Input
                    id="max-salary"
                    type="number"
                    value={advancedDraft?.maxSalaryUsd ?? ""}
                    onChange={(event) =>
                      setAdvancedDraft((current) => ({
                        ...(current ?? {}),
                        maxSalaryUsd: setNumberValue(event.target.value),
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Tech & Content</CardTitle>
                <CardDescription>Stack requirements and description-based filtering.</CardDescription>
              </CardHeader>
              <CardContent className="mt-4 grid gap-4 p-0">
                <ArrayField
                  label="Technologies"
                  value={advancedDraft?.technologies}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), technologies: next }))}
                />
                <ArrayField
                  label="Description contains"
                  value={advancedDraft?.descriptionContains}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), descriptionContains: next }))}
                />
                <ArrayField
                  label="Description excludes"
                  value={advancedDraft?.descriptionExclude}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), descriptionExclude: next }))}
                />
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Company Quality</CardTitle>
                <CardDescription>Size, revenue, and company description patterns.</CardDescription>
              </CardHeader>
              <CardContent className="mt-4 grid gap-4 p-0 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="employee-min">Minimum employee count</Label>
                  <Input
                    id="employee-min"
                    type="number"
                    value={advancedDraft?.company?.employeeCountMin ?? ""}
                    onChange={(event) =>
                      setAdvancedDraft((current) => ({
                        ...(current ?? {}),
                        company: {
                          ...(current?.company ?? {}),
                          employeeCountMin: setNumberValue(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="employee-max">Maximum employee count</Label>
                  <Input
                    id="employee-max"
                    type="number"
                    value={advancedDraft?.company?.employeeCountMax ?? ""}
                    onChange={(event) =>
                      setAdvancedDraft((current) => ({
                        ...(current ?? {}),
                        company: {
                          ...(current?.company ?? {}),
                          employeeCountMax: setNumberValue(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="revenue-min">Minimum revenue (USD)</Label>
                  <Input
                    id="revenue-min"
                    type="number"
                    value={advancedDraft?.company?.revenueMinUsd ?? ""}
                    onChange={(event) =>
                      setAdvancedDraft((current) => ({
                        ...(current ?? {}),
                        company: {
                          ...(current?.company ?? {}),
                          revenueMinUsd: setNumberValue(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="revenue-max">Maximum revenue (USD)</Label>
                  <Input
                    id="revenue-max"
                    type="number"
                    value={advancedDraft?.company?.revenueMaxUsd ?? ""}
                    onChange={(event) =>
                      setAdvancedDraft((current) => ({
                        ...(current ?? {}),
                        company: {
                          ...(current?.company ?? {}),
                          revenueMaxUsd: setNumberValue(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <ArrayField
                    label="Company description patterns"
                    value={advancedDraft?.company?.descriptionPatterns}
                    onChange={(next) =>
                      setAdvancedDraft((current) => ({
                        ...(current ?? {}),
                        company: {
                          ...(current?.company ?? {}),
                          descriptionPatterns: next,
                        },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Application Quality</CardTitle>
                <CardDescription>Source quality, apply flow, and downstream usefulness.</CardDescription>
              </CardHeader>
              <CardContent className="mt-4 grid gap-4 p-0">
                <ArrayField
                  label="Source domains include"
                  value={advancedDraft?.sourceDomainsInclude}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), sourceDomainsInclude: next }))}
                />
                <ArrayField
                  label="Source domains exclude"
                  value={advancedDraft?.sourceDomainsExclude}
                  onChange={(next) => setAdvancedDraft((current) => ({ ...(current ?? {}), sourceDomainsExclude: next }))}
                />
                <div className="grid gap-2">
                  <Label>Easy apply only</Label>
                  <Select
                    value={
                      advancedDraft?.easyApply === true
                        ? "true"
                        : advancedDraft?.easyApply === false
                          ? "false"
                          : "any"
                    }
                    onValueChange={(value) =>
                      setAdvancedDraft((current) => ({
                        ...(current ?? {}),
                        easyApply: value === "any" ? null : value === "true",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
                  <div>
                    <div className="font-medium">Must have final apply URL</div>
                    <div className="text-xs text-foreground/60">Useful when you want import-ready jobs.</div>
                  </div>
                  <Switch
                    checked={advancedDraft?.mustHaveFinalUrl === true}
                    onCheckedChange={(checked) => setAdvancedDraft((current) => ({ ...(current ?? {}), mustHaveFinalUrl: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
                  <div>
                    <div className="font-medium">Must have hiring team</div>
                    <div className="text-xs text-foreground/60">Only reveal jobs that include hiring team metadata.</div>
                  </div>
                  <Switch
                    checked={advancedDraft?.mustHaveHiringTeam === true}
                    onCheckedChange={(checked) => setAdvancedDraft((current) => ({ ...(current ?? {}), mustHaveHiringTeam: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAdvancedOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  updateFilters(advancedDraft ?? {});
                  setIsAdvancedOpen(false);
                }}
              >
                Apply filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isRevealOpen} onOpenChange={setIsRevealOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{revealedJob?.title ?? "Job details"}</SheetTitle>
            <SheetDescription>
              Revealing details uses 1 credit per job unless this role was already revealed and cached.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 pb-6">
            {isRevealing ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 px-4 py-5 text-sm text-foreground/70">
                <SpinnerGap className="h-5 w-5 animate-spin" />
                Revealing job details...
              </div>
            ) : revealError ? (
              <Alert variant="error">
                <AlertTitle>Reveal failed</AlertTitle>
                <AlertDescription>{revealError}</AlertDescription>
              </Alert>
            ) : revealedJob ? (
              <>
                <Card className="p-5">
                  <CardContent className="space-y-4 p-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" outline>
                        {revealedJob.company}
                      </Badge>
                      {revealedJob.remote ? (
                        <Badge variant="info" outline>
                          Remote
                        </Badge>
                      ) : null}
                      {revealedJob.hybrid ? (
                        <Badge variant="secondary" outline>
                          Hybrid
                        </Badge>
                      ) : null}
                    </div>

                    <div className="grid gap-3 text-sm text-foreground/75 sm:grid-cols-2">
                      <div className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {revealedJob.location || "Location unknown"}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Money className="h-4 w-4" />
                        {formatSalary(revealedJob)}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Posted {formatPostedDate(revealedJob.postedDate)}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {revealedJob.seniority || "Seniority not listed"}
                      </div>
                    </div>

                    {revealedJob.companyDescription ? (
                      <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-foreground/75">
                        {revealedJob.companyDescription}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {(revealedJob.technologies ?? []).slice(0, 8).map((entry) => (
                        <Badge key={entry} variant="secondary" outline>
                          {entry}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-5">
                  <CardHeader className="p-0">
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pt-4">
                    <div className="max-h-[36vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border/70 bg-secondary/10 p-4 text-sm text-foreground/80">
                      {revealedJob.description || "No description provided."}
                    </div>
                  </CardContent>
                </Card>

                {revealedJob.hiringTeam.length > 0 ? (
                  <Card className="p-5">
                    <CardHeader className="p-0">
                      <CardTitle className="text-base">Hiring Team</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-0 pt-4">
                      {revealedJob.hiringTeam.map((member) => (
                        <div key={`${member.fullName}-${member.role}`} className="rounded-2xl border border-border/70 px-4 py-3">
                          <div className="font-medium">{member.fullName || "Unnamed contact"}</div>
                          <div className="text-sm text-foreground/65">{member.role || "Role not listed"}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleImport} disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Add to Applications"
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCopyDescription}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy description
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!revealedJob.applyUrl) return;
                      window.open(revealedJob.applyUrl, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!revealedJob.applyUrl}
                  >
                    <ArrowSquareOut className="mr-2 h-4 w-4" />
                    Open apply link
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-foreground/65">
                Reveal a preview card to inspect the real company, application URL, and full description.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
