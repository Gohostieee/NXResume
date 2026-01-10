"use client";

import { useEffect, useState } from "react";
import { createId } from "@paralleldrive/cuid2";
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

export default function ProfilePage() {
  const profile = useQuery(api.careerProfiles.getCurrentProfile);
  const saveProfile = useMutation(api.careerProfiles.saveProfile);
  const [draft, setDraft] = useState<CareerProfile>(defaultProfile);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    if (profile === undefined) return;
    if (!profile) {
      setDraft(defaultProfile);
      return;
    }

    setDraft({
      fullName: profile.fullName ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      headline: profile.headline ?? "",
      currentTitle: profile.currentTitle ?? "",
      yearsOfExperience: profile.yearsOfExperience ?? "",
      location: profile.location ?? "",
      websiteLinks: profile.websiteLinks ?? [],
      socialLinks: profile.socialLinks ?? [],
      summary: profile.summary ?? "",
      experience: profile.experience ?? [],
      workAuthorization: profile.workAuthorization ?? "",
      desiredRoles: profile.desiredRoles ?? [],
      industries: profile.industries ?? [],
      skills: profile.skills ?? [],
      tools: profile.tools ?? [],
      strengths: profile.strengths ?? [],
      achievements: profile.achievements ?? "",
      education: profile.education ?? "",
      certifications: profile.certifications ?? [],
      portfolioLinks: profile.portfolioLinks ?? [],
      targetCompanies: profile.targetCompanies ?? [],
      jobTypes: profile.jobTypes ?? [],
      workArrangement: profile.workArrangement ?? "",
      relocation: profile.relocation ?? false,
      salaryRange: profile.salaryRange ?? "",
      availability: profile.availability ?? "",
      additionalContext: profile.additionalContext ?? "",
    });
  }, [profile]);

  const applyUpdate = (updates: Partial<CareerProfile>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setSaveState("idle");
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

  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  const lastUpdated = profile?.updatedAt
    ? new Date(profile.updatedAt).toLocaleString()
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
        <div className="text-sm text-foreground/60">
          {lastUpdated ? `Last updated ${lastUpdated}` : "No profile saved yet."}
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Basics</CardTitle>
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
            <CardTitle>Summary</CardTitle>
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
            <CardTitle>Target Roles & Market</CardTitle>
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
            <CardTitle>Skills & Strengths</CardTitle>
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
            <CardTitle>Preferences</CardTitle>
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
            <CardTitle>Education & Links</CardTitle>
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
