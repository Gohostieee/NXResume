import type { ResumeData } from "../schema";
import type { CareerProfilePatch } from "./context";
import { sanitizeCareerProfilePatch } from "./context";

export type ProfileSuggestionSourceType =
  | "resume_json_import"
  | "resume_pdf_import"
  | "resume_snapshot"
  | "application";

const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const compact = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizeList = (values: string[]) =>
  Array.from(new Set(values.map((value) => compact(value)).filter(Boolean)));

const MAX_STRENGTHS = 8;
const MAX_ACHIEVEMENTS = 8;

const isPortfolioLikeUrl = (value: string) =>
  /(github|gitlab|behance|dribbble|portfolio|medium|substack|notion|webflow|vercel|netlify|devpost|codepen)/i.test(
    value,
  );

const isLikelyStrengthPhrase = (value: string) => {
  const normalized = compact(value);
  if (!normalized) return false;
  if (normalized.length > 48) return false;
  if (/^[\d\s]+$/.test(normalized)) return false;
  return true;
};

const extractYearNumbers = (value: string) =>
  Array.from(value.matchAll(/\b(19|20)\d{2}\b/g)).map((match) => Number(match[0]));

const parseExperienceSpanYears = (date: string) => {
  const years = extractYearNumbers(date);
  if (years.length === 0) return null;

  const startYear = Math.min(...years);
  const endYear =
    /\bpresent\b|\bcurrent\b|\bnow\b/i.test(date) || years.length === 1
      ? new Date().getFullYear()
      : Math.max(...years);

  return {
    startYear,
    endYear,
  };
};

const inferYearsOfExperience = (resume: ResumeData) => {
  const spans = resume.sections.experience.items
    .map((item) => parseExperienceSpanYears(item.date))
    .filter((value): value is { startYear: number; endYear: number } => Boolean(value));

  if (spans.length === 0) return "";

  const startYear = Math.min(...spans.map((span) => span.startYear));
  const endYear = Math.max(...spans.map((span) => span.endYear));
  const years = Math.max(1, endYear - startYear);

  return `${years}+ years`;
};

const inferCurrentTitle = (resume: ResumeData) => {
  const presentRole = resume.sections.experience.items.find((item) =>
    /\bpresent\b|\bcurrent\b|\bnow\b/i.test(item.date),
  );

  return compact(
    presentRole?.position ||
      resume.sections.experience.items[0]?.position ||
      resume.basics.headline,
  );
};

const inferPortfolioLinks = (resume: ResumeData) => {
  const urls = [
    resume.basics.url.href,
    ...resume.sections.profiles.items.map((item) => item.url.href),
    ...resume.sections.projects.items.map((item) => item.url.href),
    ...resume.sections.publications.items.map((item) => item.url.href),
  ].filter(Boolean);

  const portfolioLike = urls.filter((url) => isPortfolioLikeUrl(url));
  return normalizeList((portfolioLike.length > 0 ? portfolioLike : urls).slice(0, 8));
};

const inferStrengths = (resume: ResumeData) => {
  const skillDescriptions = resume.sections.skills.items
    .flatMap((item) => [item.description, ...item.keywords])
    .map(compact)
    .filter(isLikelyStrengthPhrase);

  const projectKeywords = resume.sections.projects.items
    .flatMap((item) => item.keywords)
    .map(compact)
    .filter(isLikelyStrengthPhrase);

  const phrases = normalizeList([
    ...skillDescriptions,
    ...projectKeywords,
    ...resume.sections.skills.items.map((item) => item.name),
  ]);

  return phrases.slice(0, MAX_STRENGTHS);
};

const extractAchievementCandidates = (resume: ResumeData) => {
  const quantifiedExperienceLines = resume.sections.experience.items.flatMap((item) =>
    stripHtml(item.summary || "")
      .split(/\n+/)
      .map(compact)
      .filter((line) => /\d|%|\$|x\b|million|billion|kpi|revenue|growth|reduced|increased|improved/i.test(line)),
  );

  const awardLines = resume.sections.awards.items.map((item) =>
    compact([item.title, item.awarder, item.date].filter(Boolean).join(", ")),
  );

  const projectLines = resume.sections.projects.items.map((item) =>
    compact([item.name, stripHtml(item.summary || item.description || "")].filter(Boolean).join(": ")),
  );

  return normalizeList([...quantifiedExperienceLines, ...awardLines, ...projectLines]).slice(
    0,
    MAX_ACHIEVEMENTS,
  );
};

const inferAchievements = (resume: ResumeData) => extractAchievementCandidates(resume).join("\n");

const parseWorkArrangement = (jobDescription: string) => {
  if (/\bhybrid\b/i.test(jobDescription)) return "Hybrid";
  if (/\bremote\b/i.test(jobDescription)) return "Remote";
  if (/\bon[\s-]?site\b/i.test(jobDescription)) return "On-site";
  return "";
};

const parseSalaryRange = (jobDescription: string) => {
  const match = jobDescription.match(
    /\$?\d{2,3}(?:,\d{3})?(?:\s?-\s?\$?\d{2,3}(?:,\d{3})?)?(?:\s?(?:base|salary|annually|year|yr))?/i,
  );
  return compact(match?.[0] ?? "");
};

const parseJobTypes = (jobDescription: string) => {
  const matches = [
    /\bfull[- ]time\b/i.test(jobDescription) ? "Full-time" : "",
    /\bpart[- ]time\b/i.test(jobDescription) ? "Part-time" : "",
    /\bcontract\b/i.test(jobDescription) ? "Contract" : "",
    /\btemporary\b/i.test(jobDescription) ? "Temporary" : "",
  ].filter(Boolean);

  return normalizeList(matches);
};

const parseWorkAuthorization = (jobDescription: string) => {
  const lines = jobDescription.split(/\n+/);
  const relevant = lines.find((line) =>
    /\bsponsorship\b|\bwork authorization\b|\bauthorization\b|\bvisa\b/i.test(line),
  );
  return compact(relevant ?? "");
};

const extractProfileUrls = (resume: ResumeData) =>
  resume.sections.profiles.items
    .map((item) => item.url.href || "")
    .filter(Boolean);

const extractSkillKeywords = (resume: ResumeData) =>
  normalizeList(
    resume.sections.skills.items.flatMap((item) => [item.name, ...item.keywords, item.description]),
  );

export const buildProfilePatchFromResume = (resume: ResumeData): CareerProfilePatch => {
  const basicsUrl = resume.basics.url.href ? [resume.basics.url.href] : [];
  const summary = stripHtml(resume.sections.summary.content || "");
  const experience = resume.sections.experience.items.map((item) => ({
    id: item.id,
    company: item.company,
    title: item.position,
    location: item.location,
    startDate: item.date,
    endDate: "",
    summary: stripHtml(item.summary || ""),
    highlights: [],
  }));
  const educationLines = resume.sections.education.items.map((item) =>
    compact([item.studyType, item.area, item.institution, item.date].filter(Boolean).join(", ")),
  );
  const profileUrls = extractProfileUrls(resume);
  const portfolioLinks = inferPortfolioLinks(resume);

  const patch: CareerProfilePatch = {
    fullName: resume.basics.name,
    email: resume.basics.email,
    phone: resume.basics.phone,
    location: resume.basics.location,
    headline: resume.basics.headline,
    currentTitle: inferCurrentTitle(resume),
    yearsOfExperience: inferYearsOfExperience(resume),
    websiteLinks: basicsUrl,
    socialLinks: profileUrls,
    summary,
    experience,
    skills: normalizeList(resume.sections.skills.items.map((item) => item.name)),
    tools: extractSkillKeywords(resume).slice(0, 12),
    strengths: inferStrengths(resume),
    achievements: inferAchievements(resume),
    certifications: normalizeList(resume.sections.certifications.items.map((item) => item.name)),
    portfolioLinks,
    education: educationLines.join("\n"),
  };

  return sanitizeCareerProfilePatch(patch);
};

export const buildProfilePatchFromApplication = (input: {
  title: string;
  company: string;
  categories?: string[];
  jobDescription: string;
}): CareerProfilePatch => {
  const patch: CareerProfilePatch = {
    desiredRoles: input.title ? [input.title] : [],
    targetCompanies: input.company ? [input.company] : [],
    industries: input.categories ?? [],
    workArrangement: parseWorkArrangement(input.jobDescription),
    salaryRange: parseSalaryRange(input.jobDescription),
    workAuthorization: parseWorkAuthorization(input.jobDescription),
    jobTypes: parseJobTypes(input.jobDescription),
  };

  return sanitizeCareerProfilePatch(patch);
};
