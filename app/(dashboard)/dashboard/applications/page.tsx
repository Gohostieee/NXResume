"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  Briefcase,
  CaretDown,
  DotsThreeVertical,
  FileText,
  PencilSimple,
  Plus,
  Sparkle,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import {
  extractApplicationFromDescription,
  type CompanyResearchDetails,
} from "@/lib/ai/application-intake-client";
import { useOpenAiStore } from "@/stores/openai";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const UNKNOWN_TITLE = "Unknown Title";
const UNKNOWN_COMPANY = "Unknown Company";
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const MIN_JOB_DESCRIPTION_LENGTH = 20;
const CATEGORY_PREVIEW_COUNT = 2;

const APPLICATION_STATUS_OPTIONS = [
  {
    value: "not_applied",
    label: "Not Applied",
    className: "border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
  },
  {
    value: "applied",
    label: "Applied",
    className: "border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-200",
  },
  {
    value: "interviewing",
    label: "Interviewing",
    className: "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200",
  },
  {
    value: "offer",
    label: "Offer",
    className: "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  },
  {
    value: "rejected",
    label: "Rejected",
    className: "border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200",
  },
  {
    value: "withdrawn",
    label: "Withdrawn",
    className: "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
  },
] as const;

type ApplicationStatus = (typeof APPLICATION_STATUS_OPTIONS)[number]["value"];

const getStatusMeta = (status: string) =>
  APPLICATION_STATUS_OPTIONS.find((option) => option.value === status) ??
  APPLICATION_STATUS_OPTIONS[0];

const LOADING_STAGES = [
  "Analyzing job description...",
  "Extracting title, company, and categories...",
  "Researching company...",
  "Saving application...",
];

type Notice = {
  variant: "success" | "warning" | "error" | "info";
  title: string;
  description: string;
};

export default function ApplicationsPage() {
  const applications = useQuery(api.applications.list);
  const resumes = useQuery(api.resumes.list);
  const createFromIntake = useMutation(api.applications.createFromIntake);
  const updateApplication = useMutation(api.applications.update);
  const assignTailoredResume = useMutation(api.applications.assignTailoredResume);
  const retryExtraction = useMutation(api.applications.retryExtraction);
  const removeApplication = useMutation(api.applications.remove);
  const { apiKey, model, maxTokens, baseURL } = useOpenAiStore();

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [jobDescription, setJobDescription] = useState("");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingCompany, setEditingCompany] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);

  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [resumeImportMode, setResumeImportMode] = useState<"base" | "new">("base");
  const [selectedBaseResumeId, setSelectedBaseResumeId] = useState<string>("");
  const [isAssigningResume, setIsAssigningResume] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedCompanyResearch, setSelectedCompanyResearch] = useState<{
    company: string;
    research?: CompanyResearchDetails;
  } | null>(null);

  useEffect(() => {
    if (!isImporting) {
      setImportStep(0);
      return;
    }

    const interval = setInterval(() => {
      setImportStep((current) =>
        current < LOADING_STAGES.length - 1 ? current + 1 : current,
      );
    }, 900);

    return () => clearInterval(interval);
  }, [isImporting]);

  useEffect(() => {
    if (!resumes || resumes.length === 0) return;
    if (selectedBaseResumeId) return;
    setSelectedBaseResumeId(resumes[0]._id);
  }, [resumes, selectedBaseResumeId]);

  const descriptionValidationMessage = useMemo(() => {
    const trimmed = jobDescription.trim();

    if (!trimmed) return "Job description is required.";
    if (trimmed.length < MIN_JOB_DESCRIPTION_LENGTH) {
      return `Please add at least ${MIN_JOB_DESCRIPTION_LENGTH} characters.`;
    }
    if (trimmed.length > MAX_JOB_DESCRIPTION_LENGTH) {
      return `Please keep it under ${MAX_JOB_DESCRIPTION_LENGTH} characters.`;
    }
    return null;
  }, [jobDescription]);

  const canImport = !isImporting && descriptionValidationMessage === null;
  const hasRegularResumes = (resumes?.length ?? 0) > 0;
  const canAssignResume =
    !isAssigningResume &&
    Boolean(selectedApplicationId) &&
    (resumeImportMode === "new" || Boolean(selectedBaseResumeId));

  const openResumeDialog = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    if (hasRegularResumes) {
      setResumeImportMode("base");
      if (!selectedBaseResumeId && resumes && resumes.length > 0) {
        setSelectedBaseResumeId(resumes[0]._id);
      }
    } else {
      setResumeImportMode("new");
      setSelectedBaseResumeId("");
    }
    setIsResumeDialogOpen(true);
  };

  const handleImport = async () => {
    if (!canImport) return;

    setIsImporting(true);
    setNotice(null);

    const trimmedDescription = jobDescription.trim();
    let extractedTitle = UNKNOWN_TITLE;
    let extractedCompany = UNKNOWN_COMPANY;
    let extractedCategories: string[] = [];
    let extractedCompanyResearch: CompanyResearchDetails | undefined;
    let extractionState: "success" | "failed" = "success";
    let extractionError: string | undefined;
    let extractionWarning: string | undefined;
    let companyResearchWarning: string | undefined;

    try {
      const result = await extractApplicationFromDescription({
        jobDescription: trimmedDescription,
        apiKey,
        model,
        maxTokens,
        baseURL,
      });

      extractedTitle = result.title?.trim() || UNKNOWN_TITLE;
      extractedCompany = result.company?.trim() || UNKNOWN_COMPANY;
      extractedCategories = result.categories ?? [];
      extractedCompanyResearch = result.companyResearch;
      extractionWarning = result.warning;
      companyResearchWarning = result.companyResearchWarning;
    } catch (error) {
      extractionState = "failed";
      extractionError =
        error instanceof Error ? error.message : "Failed to extract job details";
    }

    try {
      await createFromIntake({
        jobDescription: trimmedDescription,
        title: extractedTitle,
        company: extractedCompany,
        companyResearch: extractedCompanyResearch,
        categories: extractedCategories,
        extractionState,
        extractionError,
      });

      setJobDescription("");
      setIsImportDialogOpen(false);

      if (extractionState === "failed") {
        setNotice({
          variant: "warning",
          title: "Imported with fallback values",
          description:
            "We saved the application, but AI extraction failed. You can retry extraction or edit fields manually.",
        });
      } else {
        const warnings = [extractionWarning, companyResearchWarning].filter(Boolean);

        if (warnings.length > 0) {
          setNotice({
            variant: "warning",
            title: "Imported with partial extraction",
            description: warnings.join(" "),
          });
        } else {
          setNotice({
            variant: "success",
            title: "Application imported",
            description: "Job title, company, categories, and company research were saved.",
          });
        }
      }
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Import failed",
        description: error instanceof Error ? error.message : "Could not save application.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;

    try {
      await removeApplication({ id: id as any });
      setNotice({
        variant: "info",
        title: "Application deleted",
        description: "The application was removed.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete application.",
      });
    }
  };

  const handleAssignResume = async () => {
    if (!canAssignResume || !selectedApplicationId) return;

    setIsAssigningResume(true);
    try {
      await assignTailoredResume({
        applicationId: selectedApplicationId as any,
        mode: resumeImportMode,
        baseResumeId:
          resumeImportMode === "base" ? (selectedBaseResumeId as any) : undefined,
      });

      setIsResumeDialogOpen(false);
      setNotice({
        variant: "success",
        title: "Resume assigned",
        description: "A tailored resume was linked to this job application.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Resume assignment failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not assign a tailored resume to this application.",
      });
    } finally {
      setIsAssigningResume(false);
    }
  };

  const openEditDialog = (application: {
    _id: string;
    title: string;
    company: string;
  }) => {
    setEditingId(application._id);
    setEditingTitle(application.title);
    setEditingCompany(application.company);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setIsSavingEdit(true);
    try {
      await updateApplication({
        id: editingId as any,
        title: editingTitle,
        company: editingCompany,
      });

      setIsEditDialogOpen(false);
      setEditingId(null);
      setNotice({
        variant: "success",
        title: "Application updated",
        description: "Title and company were updated.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update application.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRetryExtraction = async (application: {
    _id: string;
    jobDescription: string;
    title: string;
    company: string;
    categories?: string[];
  }) => {
    setRetryingId(application._id);
    setNotice(null);

    try {
      const result = await extractApplicationFromDescription({
        jobDescription: application.jobDescription,
        apiKey,
        model,
        maxTokens,
        baseURL,
      });

      await retryExtraction({
        id: application._id as any,
        title: result.title || UNKNOWN_TITLE,
        company: result.company || UNKNOWN_COMPANY,
        companyResearch: result.companyResearch,
        categories: result.categories ?? [],
        extractionState: "success",
        extractionError: undefined,
      });

      const warnings = [result.warning, result.companyResearchWarning].filter(Boolean);

      if (warnings.length > 0) {
        setNotice({
          variant: "warning",
          title: "Extraction retried with partial data",
          description: warnings.join(" "),
        });
      } else {
        setNotice({
          variant: "success",
          title: "Extraction retried",
          description: "AI extraction completed and fields were updated.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retry extraction.";

      try {
        await retryExtraction({
          id: application._id as any,
          title: application.title,
          company: application.company,
          categories: application.categories ?? [],
          extractionState: "failed",
          extractionError: message,
        });
      } catch {
        // Best-effort failure state update only.
      }

      setNotice({
        variant: "warning",
        title: "Retry failed",
        description:
          "AI extraction still failed. The original values were kept. You can edit fields manually.",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setChangingStatusId(id);
    try {
      await updateApplication({
        id: id as any,
        status,
      });
      setNotice({
        variant: "success",
        title: "Status updated",
        description: "Application status was updated.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Could not update status.",
      });
    } finally {
      setChangingStatusId(null);
    }
  };

  const companyResearchSections = selectedCompanyResearch?.research
    ? [
        {
          title: "Company Overview",
          content: selectedCompanyResearch.research.companyOverview,
        },
        {
          title: "Recent Events/News",
          content: selectedCompanyResearch.research.recentEventsNews,
        },
        {
          title: "Strengths/Good Aspects",
          content: selectedCompanyResearch.research.strengthsGoodAspects,
        },
        {
          title: "Funding & Financials",
          content: selectedCompanyResearch.research.fundingFinancials,
        },
        {
          title: "Future Outlook",
          content: selectedCompanyResearch.research.futureOutlook,
        },
        {
          title: "Mission & Values",
          content: selectedCompanyResearch.research.missionValues,
        },
        {
          title: "Other Notable Points",
          content: selectedCompanyResearch.research.otherNotablePoints,
        },
      ]
    : [];

  if (applications === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-foreground/60">
            Import and manage job applications from pasted job descriptions.
          </p>
        </div>

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Import Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Job Description</DialogTitle>
              <DialogDescription>
                Paste a job description and we will extract title and company with AI.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="job-description">Job Description</Label>
                <Textarea
                  id="job-description"
                  value={jobDescription}
                  disabled={isImporting}
                  rows={12}
                  placeholder="Paste the full job description here..."
                  onChange={(event) => setJobDescription(event.target.value)}
                />
                <div className="flex items-center justify-between text-xs text-foreground/60">
                  <span>
                    {jobDescription.trim().length}/{MAX_JOB_DESCRIPTION_LENGTH}
                  </span>
                  {descriptionValidationMessage ? (
                    <span className="text-warning">{descriptionValidationMessage}</span>
                  ) : (
                    <span>Looks good for import.</span>
                  )}
                </div>
              </div>

              {isImporting && (
                <div className="rounded-lg border bg-secondary/20 p-4">
                  <div className="mb-3 flex items-center gap-2 font-medium">
                    <Sparkle className="h-4 w-4 animate-pulse text-primary" />
                    Processing import...
                  </div>
                  <div className="space-y-2">
                    {LOADING_STAGES.map((stage, index) => {
                      const isDone = index < importStep;
                      const isCurrent = index === importStep;

                      return (
                        <div key={stage} className="flex items-center gap-2 text-sm">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              isDone
                                ? "bg-success"
                                : isCurrent
                                  ? "bg-primary animate-pulse"
                                  : "bg-foreground/20"
                            }`}
                          />
                          <span
                            className={
                              isDone || isCurrent ? "text-foreground" : "text-foreground/60"
                            }
                          >
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={isImporting}
                onClick={() => setIsImportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!canImport}>
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {notice && (
        <Alert className="mb-6" variant={notice.variant}>
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>{notice.description}</AlertDescription>
        </Alert>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No applications yet</h3>
            <p className="text-foreground/60">
              Import your first job description to start tracking applications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>A single list view of your imported job applications.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[1100px]">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_200px_160px_160px_120px_56px] gap-4 border-b pb-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  <div>Title</div>
                  <div>Company</div>
                  <div className="text-center">Categories</div>
                  <div className="text-center">Status</div>
                  <div className="text-center">Resume</div>
                  <div className="text-center">Imported</div>
                  <div className="text-right">Actions</div>
                </div>

                <div className="divide-y">
                  {applications.map((application) => (
                    <div
                      key={application._id}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_200px_160px_160px_120px_56px] items-center gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{application.title}</div>
                        {application.extractionState === "failed" && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                            <Warning className="h-3 w-3" />
                            Extraction failed
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Button
                          variant="ghost"
                          className="h-8 max-w-full justify-start px-0 text-left text-foreground/80 hover:bg-transparent hover:text-foreground"
                          onClick={() =>
                            setSelectedCompanyResearch({
                              company: application.company,
                              research: application.companyResearch,
                            })
                          }
                        >
                          <span className="truncate underline decoration-dotted underline-offset-4">
                            {application.company}
                          </span>
                        </Button>
                      </div>
                      <div className="flex min-w-0 justify-center">
                        {application.categories && application.categories.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-[180px] justify-between gap-2 rounded-full border-border px-2 text-xs text-foreground hover:bg-secondary/70"
                              >
                                <span className="block min-w-0 truncate">
                                  {application.categories
                                    .slice(0, CATEGORY_PREVIEW_COUNT)
                                    .join(" | ")}
                                  {application.categories.length > CATEGORY_PREVIEW_COUNT
                                    ? ` +${application.categories.length - CATEGORY_PREVIEW_COUNT}`
                                    : ""}
                                </span>
                                <CaretDown className="h-3 w-3 shrink-0 text-foreground/70" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80 p-3">
                              <div className="mb-2 text-sm font-semibold text-foreground">
                                Extracted Categories
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {application.categories.map((category: string) => (
                                  <span
                                    key={`${application._id}-${category}`}
                                    className="inline-flex items-center rounded-full border border-secondary bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
                                  >
                                    {category}
                                  </span>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-xs text-foreground/50">No categories</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Select
                          value={application.status}
                          onValueChange={(value) =>
                            handleStatusChange(application._id, value as ApplicationStatus)
                          }
                          disabled={changingStatusId === application._id}
                        >
                          <SelectTrigger
                            className={`h-7 w-full rounded-full border px-3 text-xs font-semibold ${getStatusMeta(application.status).className}`}
                          >
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex min-w-0 justify-center">
                        {application.tailoredResumeId ? (
                          <Link
                            href={`/builder/${application.tailoredResumeId}?from=applications&applicationId=${application._id}`}
                          >
                            <Button variant="outline" size="sm" className="h-8 w-[140px]">
                              <FileText className="mr-2 h-4 w-4" />
                              View Resume
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-[140px]"
                            onClick={() => openResumeDialog(application._id)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Import Resume
                          </Button>
                        )}
                      </div>
                      <div className="text-center text-sm text-foreground/70">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <DotsThreeVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {application.extractionState === "failed" && (
                              <>
                                <DropdownMenuItem
                                  disabled={retryingId === application._id}
                                  onClick={() => handleRetryExtraction(application as any)}
                                >
                                  <Sparkle className="mr-2 h-4 w-4" />
                                  {retryingId === application._id ? "Retrying..." : "Retry Extraction"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => openEditDialog(application as any)}>
                              <PencilSimple className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResumeDialog(application._id)}>
                              <FileText className="mr-2 h-4 w-4" />
                              {application.tailoredResumeId ? "Replace Resume" : "Import Resume"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-error"
                              onClick={() => handleDelete(application._id)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={selectedCompanyResearch !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedCompanyResearch(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Company Research</DialogTitle>
            <DialogDescription>
              {selectedCompanyResearch?.company ?? "Company"}
            </DialogDescription>
          </DialogHeader>

          {selectedCompanyResearch?.research ? (
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              <div className="rounded-lg border bg-secondary/20 p-3">
                <div className="text-sm font-medium text-foreground">Context</div>
                <div className="mt-1 text-sm text-foreground/80">
                  {selectedCompanyResearch.research.shortDescription}
                </div>
              </div>

              {companyResearchSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">{section.title}</div>
                  <div className="whitespace-pre-wrap text-sm text-foreground/80">{section.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-foreground/70">
              No company research is available for this application yet.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCompanyResearch(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
            <DialogDescription>Update title and company values manually.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={editingCompany}
                onChange={(event) => setEditingCompany(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Tailored Resume</DialogTitle>
            <DialogDescription>
              Choose an existing resume as the base, or create a new resume for this application.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={resumeImportMode === "base" ? "primary" : "outline"}
                onClick={() => setResumeImportMode("base")}
                disabled={!hasRegularResumes || isAssigningResume}
              >
                Use Existing Resume
              </Button>
              <Button
                type="button"
                variant={resumeImportMode === "new" ? "primary" : "outline"}
                onClick={() => setResumeImportMode("new")}
                disabled={isAssigningResume}
              >
                Create New Resume
              </Button>
            </div>

            {resumeImportMode === "base" ? (
              hasRegularResumes ? (
                <div className="grid gap-2">
                  <Label htmlFor="base-resume">Base Resume</Label>
                  <Select value={selectedBaseResumeId} onValueChange={setSelectedBaseResumeId}>
                    <SelectTrigger id="base-resume">
                      <SelectValue placeholder="Select a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {(resumes ?? []).map((resume) => (
                        <SelectItem key={resume._id} value={resume._id}>
                          {resume.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="text-sm text-warning">
                  No regular resumes found. Switch to "Create New Resume" to continue.
                </div>
              )
            ) : (
              <div className="text-sm text-foreground/70">
                A new blank resume will be created and linked only to this application.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResumeDialogOpen(false)}
              disabled={isAssigningResume}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignResume} disabled={!canAssignResume}>
              {isAssigningResume ? "Assigning..." : "Import Resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
