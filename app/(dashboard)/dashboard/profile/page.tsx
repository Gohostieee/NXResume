"use client";

import { useEffect, useState } from "react";
import { createId } from "@paralleldrive/cuid2";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { BadgeInput } from "@/components/ui/badge-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type CareerProfile = {
  fullName: string;
  email: string;
  phone: string;
  headline: string;
  currentTitle: string;
  yearsOfExperience: string;
  location: string;
  websiteLinks: string[];
  socialLinks: string[];
  summary: string;
  experience: ExperienceItem[];
  workAuthorization: string;
  desiredRoles: string[];
  industries: string[];
  skills: string[];
  tools: string[];
  strengths: string[];
  achievements: string;
  education: string;
  certifications: string[];
  portfolioLinks: string[];
  targetCompanies: string[];
  jobTypes: string[];
  workArrangement: string;
  relocation: boolean;
  salaryRange: string;
  availability: string;
  additionalContext: string;
};

type ExperienceItem = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  summary: string;
  highlights: string[];
};

type ProfileSuggestion = {
  _id: string;
  sourceType: string;
  proposedPatch: Partial<CareerProfile>;
  suggestedFields: string[];
  conflictingFields: string[];
  defaultSelectedFields: string[];
  fieldLabels: Record<string, string>;
  createdAt: number;
};

const defaultProfile: CareerProfile = {
  fullName: "",
  email: "",
  phone: "",
  headline: "",
  currentTitle: "",
  yearsOfExperience: "",
  location: "",
  websiteLinks: [],
  socialLinks: [],
  summary: "",
  experience: [],
  workAuthorization: "",
  desiredRoles: [],
  industries: [],
  skills: [],
  tools: [],
  strengths: [],
  achievements: "",
  education: "",
  certifications: [],
  portfolioLinks: [],
  targetCompanies: [],
  jobTypes: [],
  workArrangement: "",
  relocation: false,
  salaryRange: "",
  availability: "",
  additionalContext: "",
};

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  description?: string;
};

const TagInput = ({ label, value, onChange, placeholder, description }: TagInputProps) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <BadgeInput value={value} onChange={onChange} placeholder={placeholder} />
    {value.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <Badge key={`${label}-${item}`} variant="secondary" outline className="gap-1 pr-1">
            <span>{item}</span>
            <button
              type="button"
              className="rounded-full p-0.5 text-foreground/60 hover:text-foreground"
              onClick={() => onChange(value.filter((entry) => entry !== item))}
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    )}
    {description ? <p className="text-sm text-foreground/60">{description}</p> : null}
  </div>
);

const workArrangementOptions = ["Remote", "Hybrid", "On-site", "Flexible"];

const formatPatchValue = (value: unknown) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const experience = entry as ExperienceItem;
          return [experience.title, experience.company].filter(Boolean).join(" @ ");
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  return "";
};

const formatSuggestionSource = (sourceType: string) => {
  if (sourceType === "resume_json_import") return "Resume JSON Import";
  if (sourceType === "resume_pdf_import") return "Resume PDF Import";
  if (sourceType === "resume_snapshot") return "Current Resume Snapshot";
  if (sourceType === "application") return "Application / Job Description";
  return sourceType;
};

export default function ProfilePage() {
  const router = useRouter();
  const profileContext = useQuery(api.careerProfiles.getContext);
  const resumes = useQuery(api.resumes.list) ?? [];
  const suggestions = (useQuery(api.careerProfiles.listSuggestions) ?? []) as ProfileSuggestion[];
  const saveProfile = useMutation(api.careerProfiles.saveProfile);
  const createResumeFromProfile = useMutation(api.resumes.createFromProfile);
  const applySuggestion = useMutation(api.careerProfiles.applySuggestion);
  const dismissSuggestion = useMutation(api.careerProfiles.dismissSuggestion);
  const importFromResume = useMutation(api.careerProfiles.importFromResume);
  const [draft, setDraft] = useState<CareerProfile>(defaultProfile);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [isImportingResume, setIsImportingResume] = useState(false);
  const [quickActionNotice, setQuickActionNotice] = useState<string | null>(null);
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);
  const [dismissingSuggestionId, setDismissingSuggestionId] = useState<string | null>(null);
  const [selectedSuggestionFields, setSelectedSuggestionFields] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    if (profileContext === undefined) return;
    if (!profileContext) {
      setDraft(defaultProfile);
      return;
    }

    const profile = profileContext.profile;
    setDraft({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      headline: profile.headline,
      currentTitle: profile.currentTitle,
      yearsOfExperience: profile.yearsOfExperience,
      location: profile.location,
      websiteLinks: profile.websiteLinks,
      socialLinks: profile.socialLinks,
      summary: profile.summary,
      experience: profile.experience,
      workAuthorization: profile.workAuthorization,
      desiredRoles: profile.desiredRoles,
      industries: profile.industries,
      skills: profile.skills,
      tools: profile.tools,
      strengths: profile.strengths,
      achievements: profile.achievements,
      education: profile.education,
      certifications: profile.certifications,
      portfolioLinks: profile.portfolioLinks,
      targetCompanies: profile.targetCompanies,
      jobTypes: profile.jobTypes,
      workArrangement: profile.workArrangement,
      relocation: profile.relocation,
      salaryRange: profile.salaryRange,
      availability: profile.availability,
      additionalContext: profile.additionalContext,
    });
  }, [profileContext]);

  useEffect(() => {
    if (suggestions.length === 0) return;

    setSelectedSuggestionFields((current) => {
      const next = { ...current };
      for (const suggestion of suggestions) {
        if (!next[suggestion._id]) {
          next[suggestion._id] =
            suggestion.defaultSelectedFields.length > 0
              ? suggestion.defaultSelectedFields
              : suggestion.suggestedFields;
        }
      }
      return next;
    });
  }, [suggestions]);

  useEffect(() => {
    if (!selectedResumeId && resumes.length > 0) {
      setSelectedResumeId(resumes[0]._id);
    }
  }, [resumes, selectedResumeId]);

  const applyUpdate = (updates: Partial<CareerProfile>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setSaveState("idle");
  };

  const focusSummaryField = () => {
    window.requestAnimationFrame(() => {
      const field = document.getElementById("summary") as HTMLTextAreaElement | null;
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    });
  };

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await saveProfile(draft);
      setSaveState("saved");
    } catch (error) {
      console.error("Failed to save profile:", error);
      setSaveState("error");
    }
  };

  const handleCreateFromProfile = async () => {
    const resumeId = await createResumeFromProfile({
      title: draft.currentTitle?.trim()
        ? `${draft.currentTitle} Resume`
        : draft.fullName?.trim()
          ? `${draft.fullName} Resume`
          : "Profile Resume",
    });

    router.push(`/builder/${resumeId}`);
  };

  const handleGenerateTargetSummary = () => {
    const generatedSummary = profileContext?.derived.targetSummary?.trim() ?? "";

    if (!generatedSummary) {
      setQuickActionNotice(
        "There is not enough profile context yet to generate a target summary.",
      );
      return;
    }

    if (generatedSummary === draft.summary.trim()) {
      setQuickActionNotice(
        "Professional Summary already matches the generated target summary.",
      );
      focusSummaryField();
      return;
    }

    applyUpdate({ summary: generatedSummary });
    setQuickActionNotice(
      "Target summary inserted into Professional Summary below. Save Profile to keep it.",
    );
    focusSummaryField();
  };

  const handleImportFromResume = async () => {
    if (!selectedResumeId) return;

    setIsImportingResume(true);
    try {
      await importFromResume({
        resumeId: selectedResumeId as any,
      });
      setIsImportDialogOpen(false);
    } finally {
      setIsImportingResume(false);
    }
  };

  const handleApplySuggestion = async (suggestion: ProfileSuggestion) => {
    const selectedFields = selectedSuggestionFields[suggestion._id] ?? [];
    if (selectedFields.length === 0) return;

    setApplyingSuggestionId(suggestion._id);
    try {
      await applySuggestion({
        suggestionId: suggestion._id as any,
        selectedFields,
      });
    } finally {
      setApplyingSuggestionId(null);
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    setDismissingSuggestionId(suggestionId);
    try {
      await dismissSuggestion({
        suggestionId: suggestionId as any,
      });
    } finally {
      setDismissingSuggestionId(null);
    }
  };

  const toggleSuggestionField = (suggestionId: string, field: string, checked: boolean) => {
    setSelectedSuggestionFields((current) => {
      const existing = current[suggestionId] ?? [];
      const next = checked
        ? Array.from(new Set([...existing, field]))
        : existing.filter((entry) => entry !== field);
      return {
        ...current,
        [suggestionId]: next,
      };
    });
  };

  const handleAddExperience = () => {
    const newItem: ExperienceItem = {
      id: createId(),
      company: "",
      title: "",
      location: "",
      startDate: "",
      endDate: "",
      summary: "",
      highlights: [],
    };
    applyUpdate({ experience: [...draft.experience, newItem] });
  };

  const updateExperience = (id: string, updates: Partial<ExperienceItem>) => {
    applyUpdate({
      experience: draft.experience.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    });
  };

  const removeExperience = (id: string) => {
    applyUpdate({
      experience: draft.experience.filter((item) => item.id !== id),
    });
  };

  if (profileContext === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  const lastUpdated = profileContext?.updatedAt
    ? new Date(profileContext.updatedAt).toLocaleString()
    : null;

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-foreground/60">
            Build a career profile the AI can use for tailored guidance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={resumes.length === 0}>
                Import From Resume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import From Resume</DialogTitle>
                <DialogDescription>
                  Pull profile suggestions from one of your saved resumes.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                {resumes.length === 0 ? (
                  <div className="rounded border border-dashed border-border p-4 text-sm text-foreground/60">
                    Create or import a resume first, then come back here to infer profile updates.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="resume-import">Resume</Label>
                    <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                      <SelectTrigger id="resume-import">
                        <SelectValue placeholder="Select a resume" />
                      </SelectTrigger>
                      <SelectContent>
                        {resumes.map((resume) => (
                          <SelectItem key={resume._id} value={resume._id}>
                            {resume.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-foreground/60">
                      This creates reviewable profile suggestions. It does not overwrite your saved profile.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(false)}
                  disabled={isImportingResume}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleImportFromResume()}
                  disabled={isImportingResume || resumes.length === 0 || !selectedResumeId}
                >
                  {isImportingResume ? "Importing..." : "Import Resume Facts"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="text-sm text-foreground/60">
            {lastUpdated ? `Last updated ${lastUpdated}` : "No profile saved yet."}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {profileContext && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Intelligence</CardTitle>
              <CardDescription>
                Completion, missing signals, and quick actions powered by your saved profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-lg border bg-secondary/20 p-4">
                  <div className="text-sm font-semibold">
                    Completion Score: {profileContext.completeness.score}%
                  </div>
                  <div className="mt-1 text-sm text-foreground/60">
                    {profileContext.completeness.completedSections}/
                    {profileContext.completeness.totalSections} core areas complete.
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {profileContext.completeness.checklist.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          item.complete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border bg-secondary/20 p-4">
                  <div className="text-sm font-semibold">Missing Key Context</div>
                  {profileContext.missingSignals.length === 0 ? (
                    <p className="mt-2 text-sm text-foreground/60">
                      Your profile covers the core signals used by autofill and AI jobs.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {profileContext.missingSignals.map((signal) => (
                        <div key={signal} className="rounded-md border bg-background px-3 py-2 text-sm">
                          {signal}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border bg-secondary/20 p-4">
                  <div className="text-sm font-semibold">Derived Defaults</div>
                  <div className="mt-3 space-y-2 text-sm text-foreground/70">
                    <div>
                      <span className="font-medium text-foreground">Primary role: </span>
                      {profileContext.derived.primaryTargetRole || "Not set"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Top skills: </span>
                      {profileContext.derived.topSkills.slice(0, 6).join(", ") || "Not set"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Work setup: </span>
                      {profileContext.derived.preferredWorkSetup || "Not set"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-secondary/20 p-4">
                  <div className="text-sm font-semibold">Quick Actions</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void handleCreateFromProfile()}>
                      Use This Profile To Start A Resume
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateTargetSummary}
                    >
                      Generate Target Summary
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("profile-suggestions")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                    >
                      Review Inferred Updates
                    </Button>
                  </div>
                  {quickActionNotice && (
                    <div className="mt-3 rounded-md border bg-background px-3 py-2 text-sm text-foreground/70">
                      {quickActionNotice}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card id="profile-suggestions">
          <CardHeader>
            <CardTitle>Recently Inferred Updates</CardTitle>
            <CardDescription>
              Review changes inferred from resumes, imports, and applications before applying them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.length === 0 ? (
              <div className="rounded border border-dashed border-border p-4 text-sm text-foreground/60">
                No pending profile suggestions yet.
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div key={suggestion._id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {formatSuggestionSource(suggestion.sourceType)}
                      </div>
                      <div className="text-xs text-foreground/60">
                        {new Date(suggestion.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDismissSuggestion(suggestion._id)}
                        disabled={dismissingSuggestionId === suggestion._id}
                      >
                        {dismissingSuggestionId === suggestion._id ? "Dismissing..." : "Dismiss"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleApplySuggestion(suggestion)}
                        disabled={
                          applyingSuggestionId === suggestion._id ||
                          (selectedSuggestionFields[suggestion._id] ?? []).length === 0
                        }
                      >
                        {applyingSuggestionId === suggestion._id ? "Applying..." : "Apply Selected"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {suggestion.suggestedFields.map((field) => (
                      <label
                        key={`${suggestion._id}-${field}`}
                        className="flex items-start gap-3 rounded-md border bg-secondary/10 px-3 py-3"
                      >
                        <Checkbox
                          checked={(selectedSuggestionFields[suggestion._id] ?? []).includes(field)}
                          onCheckedChange={(checked) =>
                            toggleSuggestionField(suggestion._id, field, checked === true)
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">
                            {suggestion.fieldLabels[field] ?? field}
                          </div>
                          <div className="mt-1 text-sm text-foreground/70">
                            {formatPatchValue(
                              suggestion.proposedPatch[
                                field as keyof typeof suggestion.proposedPatch
                              ],
                            ) || "No preview available"}
                          </div>
                          {suggestion.conflictingFields.includes(field) && (
                            <div className="mt-2 text-xs text-amber-700">
                              Conflicts with a saved value. This will replace it only if selected.
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Name, contact details, and public links.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={draft.fullName}
                placeholder="Jordan Smith"
                onChange={(event) => applyUpdate({ fullName: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={draft.email}
                placeholder="you@example.com"
                onChange={(event) => applyUpdate({ email: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={draft.phone}
                placeholder="(555) 555-5555"
                onChange={(event) => applyUpdate({ phone: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={draft.location}
                placeholder="Dallas, TX"
                onChange={(event) => applyUpdate({ location: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={draft.headline}
                placeholder="Senior Product Designer focused on fintech growth"
                onChange={(event) => applyUpdate({ headline: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <TagInput
                label="Website Links"
                value={draft.websiteLinks}
                onChange={(value) => applyUpdate({ websiteLinks: value })}
                placeholder="https://yourportfolio.com"
                description="Add personal sites or portfolio URLs."
              />
            </div>
            <div className="sm:col-span-2">
              <TagInput
                label="Social Links"
                value={draft.socialLinks}
                onChange={(value) => applyUpdate({ socialLinks: value })}
                placeholder="https://linkedin.com/in/you"
                description="LinkedIn, GitHub, or other professional profiles."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positioning</CardTitle>
            <CardDescription>Short, punchy overview the AI can reuse.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="currentTitle">Current Title</Label>
              <Input
                id="currentTitle"
                value={draft.currentTitle}
                placeholder="Lead Frontend Engineer"
                onChange={(event) => applyUpdate({ currentTitle: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                value={draft.yearsOfExperience}
                placeholder="8+ years"
                onChange={(event) => applyUpdate({ yearsOfExperience: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workAuthorization">Work Authorization</Label>
              <Input
                id="workAuthorization"
                value={draft.workAuthorization}
                placeholder="US Citizen, no sponsorship needed"
                onChange={(event) =>
                  applyUpdate({ workAuthorization: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                value={draft.summary}
                placeholder="A short summary of your background, impact, and focus."
                onChange={(event) => applyUpdate({ summary: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
            <CardDescription>Add every role you want the AI to reference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.experience.length === 0 ? (
              <div className="rounded border border-dashed border-border p-4 text-sm text-foreground/60">
                Add your roles to help the AI tailor guidance and bullets.
              </div>
            ) : null}
            {draft.experience.map((role) => (
              <div key={role.id} className="rounded border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-sm font-semibold">Role Details</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeExperience(role.id)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input
                      value={role.title}
                      placeholder="Senior Product Designer"
                      onChange={(event) =>
                        updateExperience(role.id, { title: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Company</Label>
                    <Input
                      value={role.company}
                      placeholder="Acme Inc."
                      onChange={(event) =>
                        updateExperience(role.id, { company: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Location</Label>
                    <Input
                      value={role.location}
                      placeholder="Remote"
                      onChange={(event) =>
                        updateExperience(role.id, { location: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Start Date</Label>
                    <Input
                      value={role.startDate}
                      placeholder="Jan 2022"
                      onChange={(event) =>
                        updateExperience(role.id, { startDate: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date</Label>
                    <Input
                      value={role.endDate}
                      placeholder="Present"
                      onChange={(event) =>
                        updateExperience(role.id, { endDate: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Summary</Label>
                    <Textarea
                      value={role.summary}
                      placeholder="Scope, responsibilities, and impact."
                      onChange={(event) =>
                        updateExperience(role.id, { summary: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Highlights</Label>
                    <BadgeInput
                      value={role.highlights}
                      onChange={(value) => updateExperience(role.id, { highlights: value })}
                      placeholder="Press Enter to add a win..."
                    />
                    {role.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {role.highlights.map((highlight) => (
                          <Badge
                            key={`${role.id}-${highlight}`}
                            variant="secondary"
                            outline
                            className="gap-1 pr-1"
                          >
                            <span>{highlight}</span>
                            <button
                              type="button"
                              className="rounded-full p-0.5 text-foreground/60 hover:text-foreground"
                              onClick={() =>
                                updateExperience(role.id, {
                                  highlights: role.highlights.filter(
                                    (entry) => entry !== highlight,
                                  ),
                                })
                              }
                              aria-label={`Remove ${highlight}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddExperience}>
              Add Job
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Direction</CardTitle>
            <CardDescription>Define where you want to go next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagInput
              label="Desired Roles"
              value={draft.desiredRoles}
              onChange={(value) => applyUpdate({ desiredRoles: value })}
              placeholder="Product Manager, Growth Lead, etc."
              description="Add roles you want to target."
            />
            <TagInput
              label="Industries"
              value={draft.industries}
              onChange={(value) => applyUpdate({ industries: value })}
              placeholder="Fintech, Healthtech, SaaS"
              description="Industries you want to focus on."
            />
            <TagInput
              label="Target Companies"
              value={draft.targetCompanies}
              onChange={(value) => applyUpdate({ targetCompanies: value })}
              placeholder="Stripe, Airbnb, Shopify"
              description="Optional list of dream companies."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positioning & Strengths</CardTitle>
            <CardDescription>Capture the capabilities you want to highlight.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagInput
              label="Core Skills"
              value={draft.skills}
              onChange={(value) => applyUpdate({ skills: value })}
              placeholder="UX Strategy, Data Analysis"
            />
            <TagInput
              label="Tools & Technologies"
              value={draft.tools}
              onChange={(value) => applyUpdate({ tools: value })}
              placeholder="Figma, React, Tableau"
            />
            <TagInput
              label="Strengths"
              value={draft.strengths}
              onChange={(value) => applyUpdate({ strengths: value })}
              placeholder="Cross-functional leadership, storytelling"
            />
            <div className="grid gap-2">
              <Label htmlFor="achievements">Key Achievements</Label>
              <Textarea
                id="achievements"
                value={draft.achievements}
                placeholder="Share measurable wins or standout projects."
                onChange={(event) => applyUpdate({ achievements: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Preferences</CardTitle>
            <CardDescription>Let the AI know your job search constraints.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Work Arrangement</Label>
              <Select
                value={draft.workArrangement || undefined}
                onValueChange={(value) => applyUpdate({ workArrangement: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select arrangement" />
                </SelectTrigger>
                <SelectContent>
                  {workArrangementOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TagInput
              label="Job Types"
              value={draft.jobTypes}
              onChange={(value) => applyUpdate({ jobTypes: value })}
              placeholder="Full-time, Contract, Part-time"
            />
            <div className="grid gap-2">
              <Label htmlFor="salaryRange">Salary Range</Label>
              <Input
                id="salaryRange"
                value={draft.salaryRange}
                placeholder="$120k-$150k base"
                onChange={(event) => applyUpdate({ salaryRange: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="availability">Availability</Label>
              <Input
                id="availability"
                value={draft.availability}
                placeholder="Immediately, 2 weeks notice, etc."
                onChange={(event) => applyUpdate({ availability: event.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded border border-border px-3 py-2 sm:col-span-2">
              <div>
                <Label>Open to Relocation</Label>
                <p className="text-sm text-foreground/60">
                  Toggle if you are willing to move for the role.
                </p>
              </div>
              <Switch
                checked={draft.relocation}
                onCheckedChange={(checked) => applyUpdate({ relocation: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
            <CardDescription>Supporting details and URLs the AI can use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="education">Education</Label>
              <Textarea
                id="education"
                value={draft.education}
                placeholder="Degree, school, year, or bootcamps."
                onChange={(event) => applyUpdate({ education: event.target.value })}
              />
            </div>
            <TagInput
              label="Certifications"
              value={draft.certifications}
              onChange={(value) => applyUpdate({ certifications: value })}
              placeholder="PMP, AWS Certified, etc."
            />
            <TagInput
              label="Portfolio Links"
              value={draft.portfolioLinks}
              onChange={(value) => applyUpdate({ portfolioLinks: value })}
              placeholder="https://linkedin.com/in/you"
              description="Add LinkedIn, GitHub, portfolio, or case study URLs."
            />
            <div className="grid gap-2">
              <Label htmlFor="additionalContext">Additional Context</Label>
              <Textarea
                id="additionalContext"
                value={draft.additionalContext}
                placeholder="Any other notes that help the AI tailor guidance."
                onChange={(event) => applyUpdate({ additionalContext: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save Profile"}
          </Button>
          {saveState === "saved" && (
            <span className="text-sm text-success">Saved</span>
          )}
          {saveState === "error" && (
            <span className="text-sm text-error">Save failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
