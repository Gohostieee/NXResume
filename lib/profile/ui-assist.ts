import type { ResumeData } from "../schema";
import type { CareerProfileContext } from "./context";
import type { CoverLetterFocusModule, CoverLetterPreset } from "../ai/cover-letter-types";

type ApplicationLike = {
  title?: string;
  company?: string;
  categories?: string[];
  jobDescription?: string;
  companyResearch?: {
    missionValues?: string;
    futureOutlook?: string;
    recentEventsNews?: string;
  };
};

export const getPreferredTargetRole = (context?: CareerProfileContext | null) =>
  context?.derived.primaryTargetRole || context?.profile.desiredRoles[0] || "";

export const buildProfileContextSummary = (context?: CareerProfileContext | null) => {
  if (!context) return "No saved profile context.";

  const parts = [
    getPreferredTargetRole(context),
    context.derived.topSkills.slice(0, 3).join(", "),
    context.derived.primaryIndustries.slice(0, 2).join(", "),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "Profile context is available.";
};

export const chooseCoverLetterPreset = (
  context?: CareerProfileContext | null,
  application?: ApplicationLike | null,
): CoverLetterPreset => {
  const companySignals = [
    application?.companyResearch?.futureOutlook,
    application?.companyResearch?.recentEventsNews,
  ]
    .join(" ")
    .toLowerCase();
  const missionSignals = application?.companyResearch?.missionValues?.toLowerCase() ?? "";

  if (/(ipo|funding|growth|expansion|series [abcef]|public)/i.test(companySignals)) {
    return "growth_ipo";
  }

  if (
    missionSignals ||
    context?.profile.strengths.some((strength) => /mission|values|culture|team/i.test(strength))
  ) {
    return "mission_culture";
  }

  return "balanced";
};

export const chooseCoverLetterFocusModules = (
  context?: CareerProfileContext | null,
  application?: ApplicationLike | null,
): CoverLetterFocusModule[] => {
  const modules: CoverLetterFocusModule[] = ["recent_achievements"];
  const researchText = [
    application?.companyResearch?.missionValues,
    application?.companyResearch?.futureOutlook,
    application?.companyResearch?.recentEventsNews,
  ]
    .join(" ")
    .toLowerCase();

  if (application?.companyResearch?.missionValues || context?.profile.strengths.length) {
    modules.push("company_mission");
  }

  if (/(ipo|funding|growth|expansion|series [abcef]|public)/i.test(researchText)) {
    modules.push("ipo_growth_signals", "future_prospects");
  }

  if (context?.profile.workArrangement || context?.profile.strengths.length) {
    modules.push("work_culture");
  }

  return Array.from(new Set(modules));
};

export const buildCoverLetterDefaultInstruction = (
  context?: CareerProfileContext | null,
  application?: ApplicationLike | null,
) => {
  if (!context) return "";

  const role = getPreferredTargetRole(context);
  const topSkills = context.derived.topSkills.slice(0, 3);
  const strengths = context.derived.focusStrengths.slice(0, 2);
  const company = application?.company?.trim();

  const sentences = [
    role ? `Open from my fit for ${role} roles.` : "",
    company ? `Make the motivation for ${company} concrete, not generic.` : "",
    topSkills.length > 0 ? `Emphasize ${topSkills.join(", ")}.` : "",
    strengths.length > 0 ? `Use ${strengths.join(" and ")} as the narrative through-line.` : "",
  ].filter(Boolean);

  return sentences.join(" ");
};

export const buildApplicationProfileHints = (
  application: ApplicationLike,
  context?: CareerProfileContext | null,
) => {
  if (!context) return { suggestions: [] as string[], risks: [] as string[] };

  const suggestions = Array.from(
    new Set(
      [application.title, ...context.profile.desiredRoles, ...(application.categories ?? [])].filter(Boolean),
    ),
  ).slice(0, 4) as string[];
  const risks: string[] = [];
  const description = application.jobDescription?.toLowerCase() ?? "";

  if (
    context.profile.workAuthorization &&
    /\bsponsorship\b|\bvisa\b/i.test(description) &&
    !context.profile.workAuthorization.toLowerCase().includes("no sponsorship")
  ) {
    risks.push("Work authorization may need manual review.");
  }

  if (
    context.profile.workArrangement &&
    /on[\s-]?site/i.test(description) &&
    context.profile.workArrangement.toLowerCase() === "remote"
  ) {
    risks.push("Role appears on-site while your profile prefers remote.");
  }

  if (
    context.profile.salaryRange &&
    !description.includes(context.profile.salaryRange.toLowerCase().replace(/\s+/g, " ").slice(0, 6))
  ) {
    risks.push("Compensation match is unclear from the job description.");
  }

  return { suggestions, risks };
};

export const scoreResumeForApplication = (
  resume: { title: string; data?: ResumeData },
  application: ApplicationLike,
  context?: CareerProfileContext | null,
) => {
  const haystack = [
    resume.title,
    application.title,
    ...(application.categories ?? []),
    context?.derived.primaryTargetRole ?? "",
    ...(context?.derived.topSkills ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const label = resume.title.toLowerCase();

  if (application.title && label.includes(application.title.toLowerCase())) score += 3;
  for (const category of application.categories ?? []) {
    if (label.includes(category.toLowerCase())) score += 2;
    if (haystack.includes(category.toLowerCase())) score += 1;
  }
  if (context?.derived.primaryTargetRole && label.includes(context.derived.primaryTargetRole.toLowerCase())) {
    score += 2;
  }

  return score;
};
