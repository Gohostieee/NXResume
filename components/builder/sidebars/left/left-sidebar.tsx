"use client";

import { useResumeStore } from "@/stores/resume";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  Experience,
  Education,
  Skill,
  Language,
  Award,
  Certification,
  Interest,
  Project,
  Publication,
  Reference,
  Volunteer,
  Profile,
  CustomSection,
} from "@/lib/schema";

import { SectionBase } from "./sections/section-base";
import { BasicsSection } from "./sections/basics-section";
import { SummarySection } from "./sections/summary-section";
import {
  ExperienceDialog,
  EducationDialog,
  SkillsDialog,
  ProfilesDialog,
  ProjectsDialog,
  AwardsDialog,
  CertificationsDialog,
  LanguagesDialog,
  InterestsDialog,
  ReferencesDialog,
  VolunteerDialog,
  PublicationsDialog,
} from "./dialogs";

export function LeftSidebar() {
  const resume = useResumeStore((state) => state.resume);
  const addSection = useResumeStore((state) => state.addSection);
  const expandAllSections = useResumeStore((state) => state.expandAllSections);
  const collapseAllSections = useResumeStore((state) => state.collapseAllSections);

  if (!resume?.data) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r">
        <div className="flex h-full items-center justify-center">
          <div className="text-foreground/60">Loading...</div>
        </div>
      </aside>
    );
  }

  const customSections = resume.data.sections.custom;

  return (
    <>
      {/* All the dialogs */}
      <ExperienceDialog />
      <EducationDialog />
      <SkillsDialog />
      <ProfilesDialog />
      <ProjectsDialog />
      <AwardsDialog />
      <CertificationsDialog />
      <LanguagesDialog />
      <InterestsDialog />
      <ReferencesDialog />
      <VolunteerDialog />
      <PublicationsDialog />

      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Resume Editor</h2>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 p-4">
            <BasicsSection />

            <Separator />

            <SummarySection />

            <Separator />

            {/* Profiles Section */}
            <SectionBase<Profile>
              id="profiles"
              title={(item) => item.network}
              description={(item) => item.username}
            />

            <Separator />

            {/* Experience Section */}
            <SectionBase<Experience>
              id="experience"
              title={(item) => item.company}
              description={(item) => item.position}
            />

            <Separator />

            {/* Education Section */}
            <SectionBase<Education>
              id="education"
              title={(item) => item.institution}
              description={(item) => item.area}
            />

            <Separator />

            {/* Skills Section */}
            <SectionBase<Skill>
              id="skills"
              title={(item) => item.name}
              description={(item) => {
                if (item.description) return item.description;
                if (item.keywords.length > 0) return `${item.keywords.length} keywords`;
                return undefined;
              }}
            />

            <Separator />

            {/* Languages Section */}
            <SectionBase<Language>
              id="languages"
              title={(item) => item.name}
              description={(item) => item.description}
            />

            <Separator />

            {/* Awards Section */}
            <SectionBase<Award>
              id="awards"
              title={(item) => item.title}
              description={(item) => item.awarder}
            />

            <Separator />

            {/* Certifications Section */}
            <SectionBase<Certification>
              id="certifications"
              title={(item) => item.name}
              description={(item) => item.issuer}
            />

            <Separator />

            {/* Interests Section */}
            <SectionBase<Interest>
              id="interests"
              title={(item) => item.name}
              description={(item) => {
                if (item.keywords.length > 0) return `${item.keywords.length} keywords`;
                return undefined;
              }}
            />

            <Separator />

            {/* Projects Section */}
            <SectionBase<Project>
              id="projects"
              title={(item) => item.name}
              description={(item) => item.description}
            />

            <Separator />

            {/* Publications Section */}
            <SectionBase<Publication>
              id="publications"
              title={(item) => item.name}
              description={(item) => item.publisher}
            />

            <Separator />

            {/* Volunteer Section */}
            <SectionBase<Volunteer>
              id="volunteer"
              title={(item) => item.organization}
              description={(item) => item.position}
            />

            <Separator />

            {/* References Section */}
            <SectionBase<Reference>
              id="references"
              title={(item) => item.name}
              description={(item) => item.description}
            />

            {Object.values(customSections).map((section) => (
              <div key={section.id} className="space-y-6">
                <Separator />
                <SectionBase<CustomSection>
                  id={`custom.${section.id}`}
                  title={(item) => item.name}
                  description={(item) => item.description}
                />
              </div>
            ))}

            <Separator />

            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={addSection}>
                Add a new section
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={expandAllSections}>
                  Expand All
                </Button>
                <Button variant="outline" onClick={collapseAllSections}>
                  Collapse All
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
