export type CareerProfileExperience = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  summary: string;
  highlights: string[];
};

export type CareerProfileRecord = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  currentTitle?: string;
  yearsOfExperience?: string;
  websiteLinks?: string[];
  socialLinks?: string[];
  summary?: string;
  experience?: CareerProfileExperience[];
  workAuthorization?: string;
  desiredRoles?: string[];
  industries?: string[];
  skills?: string[];
  tools?: string[];
  strengths?: string[];
  achievements?: string;
  education?: string;
  certifications?: string[];
  portfolioLinks?: string[];
  targetCompanies?: string[];
  jobTypes?: string[];
  workArrangement?: string;
  relocation?: boolean;
  salaryRange?: string;
  availability?: string;
  additionalContext?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type CareerProfilePatch = Partial<Omit<CareerProfileRecord, "createdAt" | "updatedAt">>;

export type CareerProfileNormalized = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  currentTitle: string;
  yearsOfExperience: string;
  websiteLinks: string[];
  socialLinks: string[];
  summary: string;
  experience: CareerProfileExperience[];
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

export type CareerProfileDerived = {
  primaryTargetRole: string;
  primaryIndustries: string[];
  topSkills: string[];
  focusStrengths: string[];
  preferredWorkSetup: string;
  searchConstraints: string[];
  targetSummary: string;
};

export type CareerProfileCompleteness = {
  score: number;
  completedSections: number;
  totalSections: number;
  freshness: {
    status: "empty" | "fresh" | "aging" | "stale";
    daysSinceUpdate: number | null;
  };
  checklist: Array<{
    id: string;
    label: string;
    complete: boolean;
  }>;
};

export type CareerProfileContext = {
  profile: CareerProfileNormalized;
  derived: CareerProfileDerived;
  completeness: CareerProfileCompleteness;
  missingSignals: string[];
  updatedAt: number | null;
};

const normalizeText = (value?: string | null) => value?.trim() ?? "";

const normalizeStringArray = (values?: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      (values ?? [])
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  );

const normalizeExperience = (values?: CareerProfileExperience[]) =>
  (values ?? [])
    .map((item, index) => ({
      id: normalizeText(item?.id) || `experience-${index + 1}`,
      company: normalizeText(item?.company),
      title: normalizeText(item?.title),
      location: normalizeText(item?.location),
      startDate: normalizeText(item?.startDate),
      endDate: normalizeText(item?.endDate),
      summary: normalizeText(item?.summary),
      highlights: normalizeStringArray(item?.highlights),
    }))
    .filter(
      (item) =>
        item.company ||
        item.title ||
        item.location ||
        item.startDate ||
        item.endDate ||
        item.summary ||
        item.highlights.length > 0,
    );

export const EMPTY_CAREER_PROFILE: CareerProfileNormalized = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  currentTitle: "",
  yearsOfExperience: "",
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

export const PROFILE_FIELD_LABELS: Record<keyof CareerProfileNormalized, string> = {
  fullName: "Full Name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  headline: "Headline",
  currentTitle: "Current Title",
  yearsOfExperience: "Years of Experience",
  websiteLinks: "Website Links",
  socialLinks: "Social Links",
  summary: "Summary",
  experience: "Experience",
  workAuthorization: "Work Authorization",
  desiredRoles: "Desired Roles",
  industries: "Industries",
  skills: "Skills",
  tools: "Tools",
  strengths: "Strengths",
  achievements: "Achievements",
  education: "Education",
  certifications: "Certifications",
  portfolioLinks: "Portfolio Links",
  targetCompanies: "Target Companies",
  jobTypes: "Job Types",
  workArrangement: "Work Arrangement",
  relocation: "Open To Relocation",
  salaryRange: "Salary Range",
  availability: "Availability",
  additionalContext: "Additional Context",
};

export const normalizeCareerProfile = (
  profile?: CareerProfileRecord | null,
): CareerProfileNormalized => ({
  fullName: normalizeText(profile?.fullName),
  email: normalizeText(profile?.email),
  phone: normalizeText(profile?.phone),
  location: normalizeText(profile?.location),
  headline: normalizeText(profile?.headline),
  currentTitle: normalizeText(profile?.currentTitle),
  yearsOfExperience: normalizeText(profile?.yearsOfExperience),
  websiteLinks: normalizeStringArray(profile?.websiteLinks),
  socialLinks: normalizeStringArray(profile?.socialLinks),
  summary: normalizeText(profile?.summary),
  experience: normalizeExperience(profile?.experience),
  workAuthorization: normalizeText(profile?.workAuthorization),
  desiredRoles: normalizeStringArray(profile?.desiredRoles),
  industries: normalizeStringArray(profile?.industries),
  skills: normalizeStringArray(profile?.skills),
  tools: normalizeStringArray(profile?.tools),
  strengths: normalizeStringArray(profile?.strengths),
  achievements: normalizeText(profile?.achievements),
  education: normalizeText(profile?.education),
  certifications: normalizeStringArray(profile?.certifications),
  portfolioLinks: normalizeStringArray(profile?.portfolioLinks),
  targetCompanies: normalizeStringArray(profile?.targetCompanies),
  jobTypes: normalizeStringArray(profile?.jobTypes),
  workArrangement: normalizeText(profile?.workArrangement),
  relocation: Boolean(profile?.relocation),
  salaryRange: normalizeText(profile?.salaryRange),
  availability: normalizeText(profile?.availability),
  additionalContext: normalizeText(profile?.additionalContext),
});

const pickTopSkills = (profile: CareerProfileNormalized) =>
  Array.from(new Set([...profile.skills, ...profile.tools, ...profile.strengths])).slice(0, 8);

const buildSearchConstraints = (profile: CareerProfileNormalized) => {
  const constraints = [
    profile.workAuthorization,
    profile.workArrangement,
    profile.location,
    profile.salaryRange,
    profile.availability,
    ...profile.jobTypes,
  ].filter(Boolean);

  if (profile.relocation) {
    constraints.push("Open to relocation");
  }

  return Array.from(new Set(constraints));
};

const buildTargetSummary = (
  profile: CareerProfileNormalized,
  primaryTargetRole: string,
  topSkills: string[],
  primaryIndustries: string[],
  preferredWorkSetup: string,
) => {
  const sentences = [
    primaryTargetRole
      ? `${primaryTargetRole}${profile.yearsOfExperience ? ` with ${profile.yearsOfExperience}` : ""}`
      : profile.currentTitle || profile.headline,
    profile.summary,
    topSkills.length > 0 ? `Focus skills: ${topSkills.slice(0, 5).join(", ")}.` : "",
    primaryIndustries.length > 0
      ? `Target industries: ${primaryIndustries.slice(0, 3).join(", ")}.`
      : "",
    preferredWorkSetup ? `Preferred work setup: ${preferredWorkSetup}.` : "",
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return sentences.join(" ");
};

export const deriveCareerProfile = (
  profile: CareerProfileNormalized,
): CareerProfileDerived => {
  const primaryTargetRole =
    profile.desiredRoles[0] || profile.currentTitle || profile.headline || "";
  const primaryIndustries = profile.industries.slice(0, 3);
  const topSkills = pickTopSkills(profile);
  const focusStrengths = Array.from(new Set([...profile.strengths, ...profile.skills])).slice(0, 4);
  const preferredWorkSetup = profile.workArrangement;

  return {
    primaryTargetRole,
    primaryIndustries,
    topSkills,
    focusStrengths,
    preferredWorkSetup,
    searchConstraints: buildSearchConstraints(profile),
    targetSummary: buildTargetSummary(
      profile,
      primaryTargetRole,
      topSkills,
      primaryIndustries,
      preferredWorkSetup,
    ),
  };
};

const buildChecklist = (profile: CareerProfileNormalized) => [
  {
    id: "identity",
    label: "Identity",
    complete: Boolean(profile.fullName && (profile.email || profile.phone) && profile.location),
  },
  {
    id: "experience",
    label: "Experience",
    complete: profile.experience.length > 0,
  },
  {
    id: "positioning",
    label: "Positioning",
    complete: Boolean(profile.currentTitle || profile.headline || profile.summary),
  },
  {
    id: "target_roles",
    label: "Target Roles",
    complete: profile.desiredRoles.length > 0,
  },
  {
    id: "skills",
    label: "Skills",
    complete: profile.skills.length > 0 || profile.tools.length > 0,
  },
  {
    id: "preferences",
    label: "Search Preferences",
    complete: Boolean(
      profile.workArrangement ||
        profile.workAuthorization ||
        profile.salaryRange ||
        profile.jobTypes.length > 0,
    ),
  },
  {
    id: "evidence",
    label: "Evidence",
    complete: Boolean(profile.achievements || profile.certifications.length > 0 || profile.education),
  },
  {
    id: "links",
    label: "Links",
    complete: profile.websiteLinks.length > 0 || profile.socialLinks.length > 0 || profile.portfolioLinks.length > 0,
  },
];

const getFreshness = (updatedAt?: number | null) => {
  if (!updatedAt) {
    return { status: "empty" as const, daysSinceUpdate: null };
  }

  const daysSinceUpdate = Math.max(0, Math.floor((Date.now() - updatedAt) / 86_400_000));
  if (daysSinceUpdate <= 14) {
    return { status: "fresh" as const, daysSinceUpdate };
  }
  if (daysSinceUpdate <= 45) {
    return { status: "aging" as const, daysSinceUpdate };
  }
  return { status: "stale" as const, daysSinceUpdate };
};

export const buildCareerProfileCompleteness = (
  profile: CareerProfileNormalized,
  updatedAt?: number | null,
): CareerProfileCompleteness => {
  const checklist = buildChecklist(profile);
  const completedSections = checklist.filter((item) => item.complete).length;

  return {
    score: Math.round((completedSections / checklist.length) * 100),
    completedSections,
    totalSections: checklist.length,
    freshness: getFreshness(updatedAt),
    checklist,
  };
};

export const buildCareerProfileMissingSignals = (
  profile: CareerProfileNormalized,
  derived: CareerProfileDerived,
) => {
  const signals: string[] = [];

  if (!derived.primaryTargetRole) {
    signals.push("Add at least one target role so AI actions can prefill role-specific prompts.");
  }
  if (profile.skills.length === 0 && profile.tools.length === 0) {
    signals.push("Add core skills or tools to improve autofill and cover-letter guidance.");
  }
  if (profile.experience.length === 0) {
    signals.push("Add experience so AI jobs can anchor edits in your work history.");
  }
  if (!profile.workArrangement && !profile.location) {
    signals.push("Add location or work arrangement to improve fit and risk hints.");
  }
  if (!profile.workAuthorization) {
    signals.push("Add work authorization to improve application fit checks.");
  }
  if (!profile.summary && !profile.headline) {
    signals.push("Add a headline or summary to improve openings, summaries, and AI guidance.");
  }

  return signals;
};

export const buildCareerProfileContext = (
  profile?: CareerProfileRecord | null,
): CareerProfileContext => {
  const normalizedProfile = normalizeCareerProfile(profile);
  const updatedAt = profile?.updatedAt ?? null;
  const derived = deriveCareerProfile(normalizedProfile);

  return {
    profile: normalizedProfile,
    derived,
    completeness: buildCareerProfileCompleteness(normalizedProfile, updatedAt),
    missingSignals: buildCareerProfileMissingSignals(normalizedProfile, derived),
    updatedAt,
  };
};

const isMeaningfulValue = (value: unknown) => {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null;
};

export const sanitizeCareerProfilePatch = (patch?: CareerProfilePatch | null): CareerProfilePatch => {
  if (!patch) return {};

  const normalized: CareerProfilePatch = {};

  for (const [key, rawValue] of Object.entries(patch) as Array<
    [keyof CareerProfileNormalized, CareerProfilePatch[keyof CareerProfilePatch]]
  >) {
    if (key === "experience") {
      const experience = normalizeExperience(rawValue as CareerProfileExperience[]);
      if (experience.length > 0) {
        normalized.experience = experience;
      }
      continue;
    }

    if (
      key === "websiteLinks" ||
      key === "socialLinks" ||
      key === "desiredRoles" ||
      key === "industries" ||
      key === "skills" ||
      key === "tools" ||
      key === "strengths" ||
      key === "certifications" ||
      key === "portfolioLinks" ||
      key === "targetCompanies" ||
      key === "jobTypes"
    ) {
      const values = normalizeStringArray(rawValue as string[]);
      if (values.length > 0) {
        normalized[key] = values as never;
      }
      continue;
    }

    if (key === "relocation") {
      if (typeof rawValue === "boolean") {
        normalized.relocation = rawValue;
      }
      continue;
    }

    const value = normalizeText(rawValue as string | undefined);
    if (value) {
      normalized[key] = value as never;
    }
  }

  return normalized;
};

export const getPatchFieldKeys = (patch?: CareerProfilePatch | null) =>
  Object.keys(sanitizeCareerProfilePatch(patch)) as Array<keyof CareerProfileNormalized>;

export const getPatchConflictKeys = (
  currentProfile: CareerProfileNormalized,
  patch?: CareerProfilePatch | null,
) =>
  getPatchFieldKeys(patch).filter((key) => {
    const currentValue = currentProfile[key];
    const nextValue = sanitizeCareerProfilePatch(patch)[key];
    return isMeaningfulValue(currentValue) && JSON.stringify(currentValue) !== JSON.stringify(nextValue);
  });

export const pickCareerProfilePatch = (
  patch: CareerProfilePatch,
  fields: Array<keyof CareerProfileNormalized>,
): CareerProfilePatch => {
  const normalizedPatch = sanitizeCareerProfilePatch(patch);
  const selected = {} as CareerProfilePatch;

  for (const field of fields) {
    if (field in normalizedPatch) {
      (selected as Record<string, unknown>)[field] = normalizedPatch[field];
    }
  }

  return selected;
};

export const mergeCareerProfilePatch = (
  currentProfile: CareerProfileNormalized,
  patch?: CareerProfilePatch | null,
): CareerProfileNormalized => ({
  ...currentProfile,
  ...sanitizeCareerProfilePatch(patch),
});
