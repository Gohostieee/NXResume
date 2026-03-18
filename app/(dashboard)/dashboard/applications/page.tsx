"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  Briefcase,
  CaretDown,
  DotsThreeVertical,
  FileText,
  PencilSimple,
  Plus,
  Sparkle,
  SpinnerGap,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { CompanyResearchDetails } from "@/lib/ai/application-intake-types";
import {
  COVER_LETTER_FOCUS_MODULES,
  COVER_LETTER_MODULE_LABELS,
  COVER_LETTER_PRESET_LABELS,
  COVER_LETTER_PRESETS,
  getDefaultModulesForPreset,
  type CoverLetterFocusModule,
  type CoverLetterPreset,
} from "@/lib/ai/cover-letter-types";
import {
  buildApplicationProfileHints,
  buildCoverLetterDefaultInstruction,
  buildProfileContextSummary,
  chooseCoverLetterFocusModules,
  chooseCoverLetterPreset,
  scoreResumeForApplication,
} from "@/lib/profile/ui-assist";
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

const DEFAULT_COVER_LETTER_PRESET: CoverLetterPreset = "balanced";

type Notice = {
  variant: "success" | "warning" | "error" | "info";
  title: string;
  description: string;
};

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const applications = useQuery(api.applications.list);
  const resumes = useQuery(api.resumes.list);
  const allResumes = useQuery(api.resumes.listAll);
  const profileContext = useQuery(api.careerProfiles.getContext);
  const coverLetters = useQuery(
    api.coverLetters.listByApplicationIds,
    applications
      ? {
          applicationIds: applications.map((application) => application._id as any),
        }
      : "skip",
  );
  const enqueueAiAction = useMutation(api.aiQueue.enqueue);
  const createPendingFromIntake = useMutation(api.applications.createPendingFromIntake);
  const markExtractionPending = useMutation(api.applications.markExtractionPending);
  const updateApplication = useMutation(api.applications.update);
  const assignTailoredResume = useMutation(api.applications.assignTailoredResume);
  const retryExtraction = useMutation(api.applications.retryExtraction);
  const removeApplication = useMutation(api.applications.remove);
  const createPendingCoverLetter = useMutation(api.coverLetters.createPending);
  const removeCoverLetter = useMutation(api.coverLetters.remove);
  const { model, maxTokens } = useOpenAiStore();
  const highlightedApplicationId = searchParams.get("applicationId");

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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
  const [isCoverLetterDialogOpen, setIsCoverLetterDialogOpen] = useState(false);
  const [coverLetterApplicationId, setCoverLetterApplicationId] = useState<string | null>(null);
  const [coverLetterResumeId, setCoverLetterResumeId] = useState<string>("");
  const [coverLetterPreset, setCoverLetterPreset] = useState<CoverLetterPreset>(
    DEFAULT_COVER_LETTER_PRESET,
  );
  const [coverLetterFocusModules, setCoverLetterFocusModules] = useState<CoverLetterFocusModule[]>(
    getDefaultModulesForPreset(DEFAULT_COVER_LETTER_PRESET),
  );
  const [coverLetterCustomInstruction, setCoverLetterCustomInstruction] = useState("");
  const [isCoverLetterAdvancedOpen, setIsCoverLetterAdvancedOpen] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

  useEffect(() => {
    if (!resumes || resumes.length === 0) return;
    if (selectedBaseResumeId) return;
    setSelectedBaseResumeId(resumes[0]._id);
  }, [resumes, selectedBaseResumeId]);

  useEffect(() => {
    if (!isCoverLetterDialogOpen) return;
    if (coverLetterFocusModules.length === 0) {
      setCoverLetterFocusModules(getDefaultModulesForPreset(coverLetterPreset));
    }
  }, [coverLetterPreset, isCoverLetterDialogOpen]);

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
  const coverLettersByApplication = useMemo(() => {
    const grouped = new Map<string, any[]>();
    for (const coverLetter of coverLetters ?? []) {
      const existing = grouped.get(coverLetter.applicationId) ?? [];
      existing.push(coverLetter);
      grouped.set(coverLetter.applicationId, existing);
    }
    return grouped;
  }, [coverLetters]);
  const tailoredResumesByApplication = useMemo(() => {
    const grouped = new Map<string, any[]>();
    for (const resume of allResumes ?? []) {
      if (resume.scope !== "application_tailored" || !resume.applicationId) continue;
      const existing = grouped.get(resume.applicationId) ?? [];
      existing.push(resume);
      grouped.set(resume.applicationId, existing);
    }
    return grouped;
  }, [allResumes]);
  const selectedCoverLetterApplication = useMemo(
    () => applications?.find((application) => application._id === coverLetterApplicationId) ?? null,
    [applications, coverLetterApplicationId],
  );
  const selectedResumeApplication = useMemo(
    () => applications?.find((application) => application._id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );
  const selectedApplicationTailoredResumes = useMemo(
    () =>
      selectedCoverLetterApplication
        ? [...(tailoredResumesByApplication.get(selectedCoverLetterApplication._id) ?? [])].sort(
            (a, b) => b.updatedAt - a.updatedAt,
          )
        : [],
    [selectedCoverLetterApplication, tailoredResumesByApplication],
  );
  const availableCoverLetterResumes = useMemo(
    () => [...selectedApplicationTailoredResumes, ...(resumes ?? [])],
    [selectedApplicationTailoredResumes, resumes],
  );
  const selectedCoverLetterResume = useMemo(
    () => allResumes?.find((resume) => resume._id === coverLetterResumeId) ?? null,
    [allResumes, coverLetterResumeId],
  );
  const canGenerateCoverLetter =
    !isGeneratingCoverLetter &&
    Boolean(selectedCoverLetterApplication) &&
    Boolean(selectedCoverLetterResume) &&
    coverLetterFocusModules.length > 0;
  const isCoverLetterDialogBusy = isGeneratingCoverLetter;
  const isUsingTailoredResume = Boolean(
    selectedApplicationTailoredResumes.some((resume) => resume._id === coverLetterResumeId) &&
    selectedCoverLetterResume,
  );

  useEffect(() => {
    if (!isCoverLetterDialogOpen) return;
    if (coverLetterResumeId) return;
    if (availableCoverLetterResumes.length === 0) return;

    setCoverLetterResumeId(availableCoverLetterResumes[0]._id);
  }, [availableCoverLetterResumes, coverLetterResumeId, isCoverLetterDialogOpen]);

  useEffect(() => {
    if (!highlightedApplicationId) return;
    if (!applications?.some((application) => application._id === highlightedApplicationId)) return;

    const element = document.getElementById(`application-row-${highlightedApplicationId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [applications, highlightedApplicationId]);

  const pickRecommendedBaseResumeId = (applicationId: string) => {
    const application = applications?.find((item) => item._id === applicationId);
    if (!application || !resumes || resumes.length === 0) {
      return resumes?.[0]?._id ?? "";
    }

    return (
      [...resumes]
      .sort((left, right) => {
        const rightScore = scoreResumeForApplication(right, application, profileContext);
        const leftScore = scoreResumeForApplication(left, application, profileContext);
        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }
        return right.updatedAt - left.updatedAt;
      })[0]?._id ?? ""
    );
  };

  const openResumeDialog = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    if (hasRegularResumes) {
      setResumeImportMode("base");
      setSelectedBaseResumeId(pickRecommendedBaseResumeId(applicationId));
    } else {
      setResumeImportMode("new");
      setSelectedBaseResumeId("");
    }
    setIsResumeDialogOpen(true);
  };

  const openCoverLetterDialog = (application: {
    _id: string;
    tailoredResumeId?: string;
    title?: string;
    company?: string;
    categories?: string[];
    jobDescription?: string;
    companyResearch?: CompanyResearchDetails;
  }) => {
    const tailoredResumes = [...(tailoredResumesByApplication.get(application._id) ?? [])].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    const hasTailoredResume = Boolean(
      application.tailoredResumeId &&
      tailoredResumes.some((resume) => resume._id === application.tailoredResumeId),
    );
    const defaultResumeId =
      (hasTailoredResume ? application.tailoredResumeId : undefined) ||
      tailoredResumes[0]?._id ||
      (resumes && resumes.length > 0 ? resumes[0]._id : "");

    setCoverLetterApplicationId(application._id);
    setCoverLetterResumeId(defaultResumeId);
    const nextPreset = chooseCoverLetterPreset(profileContext, application);
    setCoverLetterPreset(nextPreset);
    setCoverLetterFocusModules(chooseCoverLetterFocusModules(profileContext, application));
    setCoverLetterCustomInstruction(buildCoverLetterDefaultInstruction(profileContext, application));
    setIsCoverLetterAdvancedOpen(false);
    setIsCoverLetterDialogOpen(true);
  };

  const toggleCoverLetterFocusModule = (module: CoverLetterFocusModule) => {
    setCoverLetterFocusModules((current) => {
      if (current.includes(module)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== module);
      }

      return [...current, module];
    });
  };

  const openResumeDialogFromCoverLetter = () => {
    if (!selectedCoverLetterApplication) return;

    setIsCoverLetterDialogOpen(false);
    openResumeDialog(selectedCoverLetterApplication._id);
  };

  const handleImport = async () => {
    if (!canImport) return;

    setIsImporting(true);
    setNotice(null);
    const trimmedDescription = jobDescription.trim();

    try {
      const applicationId = await createPendingFromIntake({
        jobDescription: trimmedDescription,
      });

      try {
        await enqueueAiAction({
          request: {
            kind: "application.extract",
            applicationId: applicationId as any,
            model: model ?? undefined,
            maxTokens: maxTokens ?? undefined,
          },
        });
      } catch (error) {
        await removeApplication({ id: applicationId as any }).catch(() => null);
        throw error;
      }

      setJobDescription("");
      setIsImportDialogOpen(false);
      setNotice({
        variant: "success",
        title: "Application imported",
        description: "The application was created and AI extraction is running in the background.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Import failed",
        description: error instanceof Error ? error.message : "Could not queue AI extraction.",
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
        baseResumeId: resumeImportMode === "base" ? (selectedBaseResumeId as any) : undefined,
      });

      setIsResumeDialogOpen(false);
      setNotice({
        variant: "success",
        title: "Tailored resume created",
        description: "A tailored resume was created for this job application.",
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

  const openEditDialog = (application: { _id: string; title: string; company: string }) => {
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
      await markExtractionPending({
        id: application._id as any,
      });

      try {
        await enqueueAiAction({
          request: {
            kind: "application.extract",
            applicationId: application._id as any,
            model: model ?? undefined,
            maxTokens: maxTokens ?? undefined,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to retry extraction.";
        await retryExtraction({
          id: application._id as any,
          title: application.title,
          company: application.company,
          categories: application.categories ?? [],
          extractionState: "failed",
          extractionError: message,
        }).catch(() => null);
        throw error;
      }

      setNotice({
        variant: "success",
        title: "Extraction queued",
        description: "AI extraction is running again for this application.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Retry failed",
        description:
          error instanceof Error ? error.message : "Could not queue AI extraction retry.",
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

  const handleGenerateCoverLetter = async () => {
    if (!canGenerateCoverLetter || !selectedCoverLetterApplication || !selectedCoverLetterResume) {
      return;
    }

    setIsGeneratingCoverLetter(true);
    try {
      const coverLetterId = await createPendingCoverLetter({
        applicationId: selectedCoverLetterApplication._id as any,
        resumeId: selectedCoverLetterResume._id as any,
        preset: coverLetterPreset,
        focusModules: coverLetterFocusModules,
        customInstruction: coverLetterCustomInstruction.trim() || undefined,
      });

      try {
        await enqueueAiAction({
          request: {
            kind: "cover_letter.generate",
            coverLetterId: coverLetterId as any,
            mode: "create",
            model: model ?? undefined,
            maxTokens: maxTokens ?? undefined,
          },
        });
      } catch (error) {
        await removeCoverLetter({ id: coverLetterId as any }).catch(() => null);
        throw error;
      }

      setIsCoverLetterDialogOpen(false);
      setNotice({
        variant: "success",
        title: "Cover letter queued",
        description:
          "The draft is generating now. It will stay in this application's cover letter list until it's ready.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Cover letter generation failed",
        description:
          error instanceof Error ? error.message : "Could not generate the cover letter right now.",
      });
    } finally {
      setIsGeneratingCoverLetter(false);
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

        <Dialog
          open={isImportDialogOpen}
          onOpenChange={(isOpen) => {
            if (isImporting) return;
            setIsImportDialogOpen(isOpen);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Import Job
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-2xl"
            onEscapeKeyDown={(event) => {
              if (isImporting) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (isImporting) event.preventDefault();
            }}
          >
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
                {isImporting ? "Queueing..." : "Import"}
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
              <div className="min-w-[1280px]">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_200px_160px_160px_180px_120px_56px] gap-4 border-b pb-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  <div>Title</div>
                  <div>Company</div>
                  <div className="text-center">Categories</div>
                  <div className="text-center">Status</div>
                  <div className="text-center">Resume</div>
                  <div className="text-center">Cover Letter</div>
                  <div className="text-center">Imported</div>
                  <div className="text-right">Actions</div>
                </div>

                <div className="divide-y">
                  {applications.map((application) => (
                    <div
                      key={application._id}
                      id={`application-row-${application._id}`}
                      className={`grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_200px_160px_160px_180px_120px_56px] items-center gap-4 rounded-xl px-2 py-4 transition-colors ${
                        application._id === highlightedApplicationId
                          ? "bg-info/10 ring-1 ring-info/30"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{application.title}</div>
                        {application.extractionState === "pending" && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-sky-700">
                            <SpinnerGap className="h-3 w-3 animate-spin" />
                            AI extraction in progress
                          </div>
                        )}
                        {application.extractionState === "failed" && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                            <Warning className="h-3 w-3" />
                            Extraction failed
                          </div>
                        )}
                        {application.extractionState === "success" &&
                          (application.extractionWarnings?.length ?? 0) > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                              <Warning className="h-3 w-3" />
                              Imported with warnings
                            </div>
                          )}
                        {profileContext && (() => {
                          const hints = buildApplicationProfileHints(application, profileContext);
                          if (hints.suggestions.length === 0 && hints.risks.length === 0) {
                            return null;
                          }

                          return (
                            <div className="mt-2 space-y-1 text-xs text-foreground/65">
                              {hints.suggestions.length > 0 && (
                                <div>
                                  Profile suggests: {hints.suggestions.slice(0, 2).join(" | ")}
                                </div>
                              )}
                              {hints.risks.length > 0 && (
                                <div className="text-amber-700">
                                  {hints.risks.slice(0, 1).join(" ")}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-[170px] justify-between"
                            >
                              Tailored Resumes
                              <CaretDown className="ml-2 h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-72">
                            <DropdownMenuItem onClick={() => openResumeDialog(application._id)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Create Tailored Resume
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {[...(tailoredResumesByApplication.get(application._id) ?? [])]
                              .length === 0 ? (
                              <DropdownMenuItem disabled>No tailored resumes yet</DropdownMenuItem>
                            ) : (
                              [...(tailoredResumesByApplication.get(application._id) ?? [])]
                                .sort((a, b) => b.updatedAt - a.updatedAt)
                                .map((resume) => (
                                  <DropdownMenuItem asChild key={resume._id}>
                                    <Link
                                      href={`/builder/${resume._id}?from=applications&applicationId=${application._id}`}
                                    >
                                      <div className="flex w-full items-center justify-between gap-2">
                                        <span className="truncate">{resume.title}</span>
                                        <span className="text-xs text-foreground/60">
                                          {resume._id === application.tailoredResumeId
                                            ? "Current"
                                            : new Date(resume.updatedAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </Link>
                                  </DropdownMenuItem>
                                ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex min-w-0 justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-[170px] justify-between"
                            >
                              Cover Letters
                              <CaretDown className="ml-2 h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-72">
                            <DropdownMenuItem onClick={() => openCoverLetterDialog(application)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Create Cover Letter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {[...(coverLettersByApplication.get(application._id) ?? [])].length ===
                            0 ? (
                              <DropdownMenuItem disabled>No cover letters yet</DropdownMenuItem>
                            ) : (
                              [...(coverLettersByApplication.get(application._id) ?? [])]
                                .sort((a, b) => b.updatedAt - a.updatedAt)
                                .map((coverLetter) => {
                                  const isGenerating =
                                    coverLetter.generationState === "queued" ||
                                    coverLetter.generationState === "running";

                                  if (isGenerating) {
                                    return (
                                      <DropdownMenuItem
                                        key={coverLetter._id}
                                        disabled
                                        className="cursor-default opacity-70"
                                      >
                                        <div className="flex w-full items-center justify-between gap-2">
                                          <span className="truncate text-foreground/70">
                                            {coverLetter.title}
                                          </span>
                                          <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
                                            <SpinnerGap className="h-3 w-3 animate-spin" />
                                            Generating
                                          </span>
                                        </div>
                                      </DropdownMenuItem>
                                    );
                                  }

                                  return (
                                    <DropdownMenuItem asChild key={coverLetter._id}>
                                      <Link href={`/dashboard/cover-letters/${coverLetter._id}`}>
                                        <div className="flex w-full items-center justify-between gap-2">
                                          <span className="truncate">{coverLetter.title}</span>
                                          <span className="text-xs text-foreground/60">
                                            {coverLetter.generationState === "failed"
                                              ? "Failed"
                                              : coverLetter.visibility === "public"
                                                ? "Public"
                                                : "Private"}
                                          </span>
                                        </div>
                                      </Link>
                                    </DropdownMenuItem>
                                  );
                                })
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                                  {retryingId === application._id
                                    ? "Retrying..."
                                    : "Retry Extraction"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              disabled={application.extractionState === "pending"}
                              onClick={() => openEditDialog(application as any)}
                            >
                              <PencilSimple className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResumeDialog(application._id)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Create Tailored Resume
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
            <DialogDescription>{selectedCompanyResearch?.company ?? "Company"}</DialogDescription>
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
                  <div className="whitespace-pre-wrap text-sm text-foreground/80">
                    {section.content}
                  </div>
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
            <DialogTitle>Create Tailored Resume</DialogTitle>
            <DialogDescription>
              Choose an existing resume as the base, or create a new resume for this application.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {profileContext && selectedResumeApplication && (
              <div className="rounded-md border bg-secondary/20 px-3 py-2 text-sm text-foreground/70">
                <div className="font-medium text-foreground">Profile-guided recommendation</div>
                <div className="mt-1">
                  {buildProfileContextSummary(profileContext)}
                </div>
                {resumeImportMode === "base" && selectedBaseResumeId && (
                  <div className="mt-1 text-xs text-foreground/60">
                    Recommended base resume selected from your saved profile and this role.
                  </div>
                )}
              </div>
            )}
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
              {isAssigningResume ? "Creating..." : "Create Resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCoverLetterDialogOpen}
        onOpenChange={(isOpen) => {
          if (isCoverLetterDialogBusy) return;
          setIsCoverLetterDialogOpen(isOpen);
        }}
      >
        <DialogContent
          className="sm:max-w-2xl"
          onEscapeKeyDown={(event) => {
            if (isCoverLetterDialogBusy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (isCoverLetterDialogBusy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Cover Letter</DialogTitle>
            <DialogDescription>
              Generate a modular cover letter using this application and your resume context.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
              {profileContext && (
                <div className="rounded-md border bg-secondary/20 px-3 py-2 text-sm text-foreground/70">
                  <div className="font-medium text-foreground">Using profile context</div>
                  <div className="mt-1">{buildProfileContextSummary(profileContext)}</div>
                  {coverLetterCustomInstruction && (
                    <div className="mt-2 text-xs text-foreground/60">
                      Default direction was prefilled from your profile and this application.
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="cover-letter-preset">Preset</Label>
                <Select
                  value={coverLetterPreset}
                  onValueChange={(value) => setCoverLetterPreset(value as CoverLetterPreset)}
                  disabled={isGeneratingCoverLetter}
                >
                  <SelectTrigger id="cover-letter-preset">
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {COVER_LETTER_PRESETS.map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {COVER_LETTER_PRESET_LABELS[preset]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Resume Source</Label>
                {availableCoverLetterResumes.length > 0 ? (
                  <div className="grid gap-2">
                    <Select
                      value={coverLetterResumeId}
                      onValueChange={setCoverLetterResumeId}
                      disabled={isGeneratingCoverLetter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a resume" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedApplicationTailoredResumes.map((resume) => (
                          <SelectItem key={resume._id} value={resume._id}>
                            {resume.title} (Tailored)
                          </SelectItem>
                        ))}
                        {(resumes ?? []).map((resume) => (
                          <SelectItem key={resume._id} value={resume._id}>
                            {resume.title} (Base)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isUsingTailoredResume && (
                      <div className="rounded-md border bg-secondary/20 px-3 py-2 text-sm">
                        Using a tailored resume linked to this application.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
                    <p>No resumes available. Import or create a resume before generating.</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={openResumeDialogFromCoverLetter}
                    >
                      Import Resume
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cover-letter-custom">Custom Direction (Optional)</Label>
                <Textarea
                  id="cover-letter-custom"
                  value={coverLetterCustomInstruction}
                  disabled={isGeneratingCoverLetter}
                  placeholder="Add any specific angle or idea you want emphasized."
                  onChange={(event) => setCoverLetterCustomInstruction(event.target.value)}
                />
              </div>

              <div className="rounded-md border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
                  onClick={() => setIsCoverLetterAdvancedOpen((current) => !current)}
                  disabled={isGeneratingCoverLetter}
                >
                  Advanced Focus Modules
                  <CaretDown
                    className={`h-4 w-4 transition-transform ${
                      isCoverLetterAdvancedOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isCoverLetterAdvancedOpen && (
                  <div className="grid gap-2 border-t p-3">
                    {COVER_LETTER_FOCUS_MODULES.map((module) => {
                      const enabled = coverLetterFocusModules.includes(module);
                      return (
                        <Button
                          key={module}
                          type="button"
                          size="sm"
                          variant={enabled ? "primary" : "outline"}
                          className="justify-start"
                          onClick={() => toggleCoverLetterFocusModule(module)}
                          disabled={isGeneratingCoverLetter}
                        >
                          {COVER_LETTER_MODULE_LABELS[module]}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCoverLetterDialogOpen(false)}
              disabled={isGeneratingCoverLetter}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateCoverLetter} disabled={!canGenerateCoverLetter}>
              {isGeneratingCoverLetter ? "Queueing..." : "Generate Cover Letter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
