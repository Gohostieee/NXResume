import { createId } from "@paralleldrive/cuid2";
import type { ResumeData } from "../schema";
import { defaultResumeData } from "../schema";
import type { CareerProfileContext } from "./context";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toParagraphHtml = (value: string) =>
  value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

const guessNetwork = (url: string) => {
  const normalized = url.toLowerCase();
  if (normalized.includes("linkedin")) return { network: "LinkedIn", icon: "linkedin" };
  if (normalized.includes("github")) return { network: "GitHub", icon: "github" };
  if (normalized.includes("twitter") || normalized.includes("x.com")) {
    return { network: "X", icon: "x" };
  }
  if (normalized.includes("portfolio")) return { network: "Portfolio", icon: "internetarchive" };
  return { network: "Website", icon: "googlechrome" };
};

const cloneDefaultResume = (): ResumeData => JSON.parse(JSON.stringify(defaultResumeData));

const SKILL_BUCKETS = [
  {
    label: "Frontend",
    aliases: ["frontend", "front-end", "ui", "client-side"],
    technologies: [
      { name: "React", pattern: /\breact\b/i },
      { name: "Next.js", pattern: /\bnext(?:\.js)?\b/i },
      { name: "Vite", pattern: /\bvite\b/i },
      { name: "Redux", pattern: /\bredux\b/i },
      { name: "Context API", pattern: /\bcontext api\b/i },
      { name: "Zustand", pattern: /\bzustand\b/i },
      { name: "Tailwind CSS", pattern: /\btailwind\b/i },
      { name: "TypeScript", pattern: /\btypescript\b/i },
      { name: "JavaScript", pattern: /\bjavascript\b/i },
      { name: "HTML/CSS", pattern: /\bhtml\b|\bcss\b/i },
    ],
  },
  {
    label: "Backend",
    aliases: ["backend", "back-end", "server", "api", "microservices"],
    technologies: [
      { name: "Node.js", pattern: /\bnode(?:\.js|js)?\b/i },
      { name: "REST APIs", pattern: /\brest(?:ful)? api/i },
      { name: "GraphQL", pattern: /\bgraphql\b/i },
      { name: "WebSockets", pattern: /\bwebsocket/i },
      { name: "Microservices", pattern: /\bmicroservices?\b/i },
      { name: "TypeScript", pattern: /\btypescript\b/i },
      { name: "JavaScript", pattern: /\bjavascript\b/i },
      { name: "Python", pattern: /\bpython\b/i },
    ],
  },
  {
    label: "Databases",
    aliases: ["database", "databases", "data", "storage"],
    technologies: [
      { name: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i },
      { name: "BigQuery", pattern: /\bbigquery\b/i },
      { name: "Firebase", pattern: /\bfirebase\b/i },
      { name: "MongoDB", pattern: /\bmongodb\b/i },
      { name: "MySQL", pattern: /\bmysql\b/i },
      { name: "Redis", pattern: /\bredis\b/i },
      { name: "SQL", pattern: /\bsql\b/i },
    ],
  },
  {
    label: "CI/CD",
    aliases: ["ci/cd", "ci cd", "cicd", "devops", "deployment"],
    technologies: [
      { name: "CI/CD", pattern: /\bci\/cd\b|\bci cd\b|\bcicd\b/i },
      { name: "ArgoCD", pattern: /\bargocd\b/i },
      { name: "GitHub Actions", pattern: /\bgithub actions\b/i },
      { name: "Docker", pattern: /\bdocker\b/i },
      { name: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
    ],
  },
  {
    label: "Cloud",
    aliases: ["cloud", "infrastructure", "aws", "gcp", "platform"],
    technologies: [
      { name: "AWS", pattern: /\baws\b|\becs\b|\blambda\b|\bs3\b/i },
      { name: "GCP", pattern: /\bgcp\b|\bgoogle cloud\b/i },
      { name: "Docker", pattern: /\bdocker\b/i },
      { name: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
    ],
  },
  {
    label: "AI/LLMs",
    aliases: ["ai", "llm", "rag", "machine learning"],
    technologies: [
      { name: "LLMs", pattern: /\bllms?\b|\blarge language model/i },
      { name: "RAG", pattern: /\brag\b/i },
      { name: "Conversational AI", pattern: /\bconversational ai\b/i },
      { name: "Fine-tuning", pattern: /\bfine-?tun/i },
    ],
  },
] as const;

const normalizeTerm = (value: string) => value.trim().replace(/\s+/g, " ");

const isBucketAlias = (value: string) =>
  SKILL_BUCKETS.some((bucket) =>
    bucket.aliases.some((alias) => normalizeTerm(value).toLowerCase() === alias),
  );

const detectExplicitBuckets = (values: string[]) =>
  SKILL_BUCKETS.filter((bucket) =>
    values.some((value) =>
      bucket.aliases.some((alias) => normalizeTerm(value).toLowerCase() === alias),
    ),
  );

type ResumeSkillItem = ResumeData["sections"]["skills"]["items"][number];

const collectBucketedSkills = (context: CareerProfileContext) => {
  const rawTerms = Array.from(new Set([...context.profile.skills, ...context.profile.tools]));
  const explicitBuckets = detectExplicitBuckets(context.profile.skills);
  const terms = rawTerms.filter((term) => !isBucketAlias(term));

  const bucketMap = new Map<string, string[]>();

  for (const bucket of SKILL_BUCKETS) {
    const found = bucket.technologies
      .filter((technology) => terms.some((term) => technology.pattern.test(term)))
      .map((technology) => technology.name);

    if (found.length > 0) {
      bucketMap.set(bucket.label, Array.from(new Set(found)));
    }
  }

  const orderedBuckets = [
    ...explicitBuckets,
    ...SKILL_BUCKETS.filter(
      (bucket) =>
        !explicitBuckets.some((explicitBucket) => explicitBucket.label === bucket.label) &&
        bucketMap.has(bucket.label),
    ),
  ];

  return orderedBuckets
    .map((bucket) => {
      const keywords = bucketMap.get(bucket.label) ?? [];
      if (keywords.length === 0) return null;

      const item: ResumeSkillItem = {
        id: createId(),
        visible: true,
        name: bucket.label,
        description: "",
        level: 0,
        keywords,
      };

      return item;
    })
    .filter(Boolean) as ResumeSkillItem[];
};

const buildGroupedSkillItems = (context: CareerProfileContext) => {
  const bucketedItems = collectBucketedSkills(context);
  if (bucketedItems.length > 0) {
    return bucketedItems;
  }

  const fallbackKeywords = Array.from(new Set([...context.profile.skills, ...context.profile.tools]))
    .filter((term) => !isBucketAlias(term))
    .slice(0, 12);

  if (fallbackKeywords.length === 0) {
    return [];
  }

  return [
    {
      id: createId(),
      visible: true,
      name: "Technologies",
      description: "",
      level: 0,
      keywords: fallbackKeywords.map(normalizeTerm),
    },
  ];
};

export const buildResumeFromProfileContext = (context: CareerProfileContext): ResumeData => {
  const resume = cloneDefaultResume();
  const { profile, derived } = context;
  const summary = profile.summary || derived.targetSummary;
  const links = Array.from(
    new Set([...profile.websiteLinks, ...profile.socialLinks, ...profile.portfolioLinks]),
  );

  resume.basics.name = profile.fullName;
  resume.basics.headline = profile.headline || profile.currentTitle || derived.primaryTargetRole;
  resume.basics.email = profile.email;
  resume.basics.phone = profile.phone;
  resume.basics.location = profile.location;

  if (profile.websiteLinks[0]) {
    resume.basics.url = {
      label: "Portfolio",
      href: profile.websiteLinks[0],
    };
  }

  resume.sections.summary.content = summary ? toParagraphHtml(summary) : "";
  resume.sections.summary.visible = Boolean(summary);

  resume.sections.profiles.items = links.map((url) => {
    const network = guessNetwork(url);
    return {
      id: createId(),
      visible: true,
      network: network.network,
      username: url,
      icon: network.icon,
      url: {
        label: network.network,
        href: url,
      },
    };
  });
  resume.sections.profiles.visible = resume.sections.profiles.items.length > 0;
  resume.sections.profiles.columns = Math.max(1, Math.min(resume.sections.profiles.items.length || 1, 4));

  resume.sections.experience.items = profile.experience.map((item) => ({
    id: item.id || createId(),
    visible: true,
    company: item.company,
    position: item.title,
    location: item.location,
    date: [item.startDate, item.endDate].filter(Boolean).join(" - "),
    summary: toParagraphHtml(item.summary || item.highlights.join("\n")),
    url: { label: "", href: "" },
  }));
  resume.sections.experience.visible = resume.sections.experience.items.length > 0;

  resume.sections.skills.items = buildGroupedSkillItems(context);
  resume.sections.skills.visible = resume.sections.skills.items.length > 0;

  if (profile.education) {
    resume.sections.education.items = [
      {
        id: createId(),
        visible: true,
        institution: profile.education,
        studyType: "",
        area: "",
        score: "",
        date: "",
        summary: "",
        url: { label: "", href: "" },
      },
    ];
    resume.sections.education.visible = true;
  }

  resume.sections.certifications.items = profile.certifications.map((name) => ({
    id: createId(),
    visible: true,
    name,
    issuer: "",
    date: "",
    summary: "",
    url: { label: "", href: "" },
  }));
  resume.sections.certifications.visible = resume.sections.certifications.items.length > 0;

  return resume;
};
