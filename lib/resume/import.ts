import { createId } from "@paralleldrive/cuid2";
import { type ResumeData, resumeDataSchema, type CustomSectionGroup } from "../schema";
import { JsonResumeParser } from "../parser/json-resume";
import { ReactiveResumeParser } from "../parser/reactive-resume";
import { ReactiveResumeV3Parser } from "../parser/reactive-resume-v3";
import type { Parser } from "../parser/interfaces/parser";
import { isCuid2Id } from "../schema/shared/id";

const jsonParsers: Array<Parser<unknown, unknown, ResumeData>> = [
  new ReactiveResumeParser(),
  new ReactiveResumeV3Parser(),
  new JsonResumeParser(),
];

const createImportIdNormalizer = () => {
  const seenIds = new Set<string>();

  return (value: unknown) => {
    if (typeof value === "string" && isCuid2Id(value) && !seenIds.has(value)) {
      seenIds.add(value);
      return value;
    }

    const nextId = createId();
    seenIds.add(nextId);
    return nextId;
  };
};

const normalizeImportedResumeIds = (resume: ResumeData): ResumeData => {
  const normalizeId = createImportIdNormalizer();

  return {
    ...resume,
    basics: {
      ...resume.basics,
      customFields: resume.basics.customFields.map((field: ResumeData["basics"]["customFields"][number]) => ({
        ...field,
        id: normalizeId(field.id),
      })),
    },
    sections: {
      ...resume.sections,
      awards: {
        ...resume.sections.awards,
        items: resume.sections.awards.items.map((item: ResumeData["sections"]["awards"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
        })),
      },
      certifications: {
        ...resume.sections.certifications,
        items: resume.sections.certifications.items.map(
          (item: ResumeData["sections"]["certifications"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      education: {
        ...resume.sections.education,
        items: resume.sections.education.items.map(
          (item: ResumeData["sections"]["education"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      experience: {
        ...resume.sections.experience,
        items: resume.sections.experience.items.map(
          (item: ResumeData["sections"]["experience"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      volunteer: {
        ...resume.sections.volunteer,
        items: resume.sections.volunteer.items.map(
          (item: ResumeData["sections"]["volunteer"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      interests: {
        ...resume.sections.interests,
        items: resume.sections.interests.items.map(
          (item: ResumeData["sections"]["interests"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      languages: {
        ...resume.sections.languages,
        items: resume.sections.languages.items.map(
          (item: ResumeData["sections"]["languages"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      profiles: {
        ...resume.sections.profiles,
        items: resume.sections.profiles.items.map(
          (item: ResumeData["sections"]["profiles"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      projects: {
        ...resume.sections.projects,
        items: resume.sections.projects.items.map(
          (item: ResumeData["sections"]["projects"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      publications: {
        ...resume.sections.publications,
        items: resume.sections.publications.items.map(
          (item: ResumeData["sections"]["publications"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      references: {
        ...resume.sections.references,
        items: resume.sections.references.items.map(
          (item: ResumeData["sections"]["references"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      skills: {
        ...resume.sections.skills,
        items: resume.sections.skills.items.map(
          (item: ResumeData["sections"]["skills"]["items"][number]) => ({
          ...item,
          id: normalizeId(item.id),
          }),
        ),
      },
      custom: Object.fromEntries(
        Object.entries(resume.sections.custom).map(([key, section]: [string, CustomSectionGroup]) => [
          key,
          {
            ...section,
            id: normalizeId(section.id),
            items: section.items.map((item: CustomSectionGroup["items"][number]) => ({
              ...item,
              id: normalizeId(item.id),
            })),
          },
        ]),
      ),
    },
  };
};

const normalizeSectionVisibility = (resume: ResumeData): ResumeData => {
  const summaryVisible = resume.sections.summary.content.trim().length > 0;
  const profileColumns = Math.max(
    1,
    Math.min(resume.sections.profiles.items.length || 1, 5),
  );

  return {
    ...resume,
    sections: {
      ...resume.sections,
      summary: {
        ...resume.sections.summary,
        visible: summaryVisible,
      },
      awards: {
        ...resume.sections.awards,
        visible: resume.sections.awards.items.length > 0,
      },
      certifications: {
        ...resume.sections.certifications,
        visible: resume.sections.certifications.items.length > 0,
      },
      education: {
        ...resume.sections.education,
        visible: resume.sections.education.items.length > 0,
      },
      experience: {
        ...resume.sections.experience,
        visible: resume.sections.experience.items.length > 0,
      },
      volunteer: {
        ...resume.sections.volunteer,
        visible: resume.sections.volunteer.items.length > 0,
      },
      interests: {
        ...resume.sections.interests,
        visible: resume.sections.interests.items.length > 0,
      },
      languages: {
        ...resume.sections.languages,
        visible: resume.sections.languages.items.length > 0,
      },
      profiles: {
        ...resume.sections.profiles,
        columns: profileColumns,
        visible: resume.sections.profiles.items.length > 0,
      },
      projects: {
        ...resume.sections.projects,
        visible: resume.sections.projects.items.length > 0,
      },
      publications: {
        ...resume.sections.publications,
        visible: resume.sections.publications.items.length > 0,
      },
      references: {
        ...resume.sections.references,
        visible: resume.sections.references.items.length > 0,
      },
      skills: {
        ...resume.sections.skills,
        visible: resume.sections.skills.items.length > 0,
      },
    },
  };
};

export const normalizeImportedResume = (resume: ResumeData): ResumeData =>
  resumeDataSchema.parse(
    normalizeSectionVisibility(normalizeImportedResumeIds(resume)),
  );

export const importResumeFromJsonFile = async (
  file: File,
): Promise<ResumeData> => {
  if (!file.name.toLowerCase().endsWith(".json")) {
    throw new Error("Please choose a JSON file.");
  }

  for (const parser of jsonParsers) {
    try {
      const raw = await parser.readFile(file);
      const validated = await parser.validate(raw);
      const converted = await parser.convert(validated);

      return normalizeImportedResume(resumeDataSchema.parse(converted));
    } catch {
      continue;
    }
  }

  throw new Error(
    "Unsupported JSON resume format. Import an NXResume export, Reactive Resume JSON, or JSON Resume file.",
  );
};
