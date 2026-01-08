"use client";

import { useResumeStore } from "@/stores/resume";
import { useAutoSaveStore } from "@/stores/auto-save";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichInput } from "@/components/ui/rich-input";
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
} from "@/lib/schema";

import { SectionBase } from "./sections/section-base";
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
  const setValue = useResumeStore((state) => state.setValue);
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);

  // Save on blur handler
  const handleBlur = () => {
    triggerSave();
  };

  if (!resume?.data) {
    return (
      <aside className="w-80 overflow-hidden border-r">
        <div className="flex h-full items-center justify-center">
          <div className="text-foreground/60">Loading...</div>
        </div>
      </aside>
    );
  }

  const basics = resume.data.basics;
  const summary = resume.data.sections?.summary;

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

      <aside className="flex w-80 flex-col overflow-hidden border-r">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Resume Editor</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Basics Section */}
            <Accordion type="single" collapsible defaultValue="basics">
              <AccordionItem value="basics" className="border-none">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <span className="font-semibold">Basics</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={basics?.name || ""}
                        onChange={(e) => setValue("basics.name", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="headline">Headline</Label>
                      <Input
                        id="headline"
                        value={basics?.headline || ""}
                        onChange={(e) => setValue("basics.headline", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="Software Engineer"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={basics?.email || ""}
                        onChange={(e) => setValue("basics.email", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={basics?.phone || ""}
                        onChange={(e) => setValue("basics.phone", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={basics?.location || ""}
                        onChange={(e) => setValue("basics.location", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="San Francisco, CA"
                      />
                    </div>

                    <div>
                      <Label htmlFor="url">Website</Label>
                      <Input
                        id="url"
                        value={basics?.url?.href || ""}
                        onChange={(e) => setValue("basics.url.href", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Summary Section */}
            <Accordion type="single" collapsible defaultValue="summary">
              <AccordionItem value="summary" className="border-none">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <span className="font-semibold">Summary</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <RichInput
                      content={summary?.content || ""}
                      onChange={(value) => setValue("sections.summary.content", value)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
