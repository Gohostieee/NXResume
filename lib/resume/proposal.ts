import type { ResumeData } from "../schema";

export type ResumeProposalSource = "ai_queue" | "ai_editor" | "other";
export type ResumeProposalStatus = "idle" | "ready" | "previewing" | "stale";

export type ResumeProposalState = {
  status: ResumeProposalStatus;
  source: ResumeProposalSource | null;
  baseSnapshot: ResumeData | null;
  proposalSnapshot: ResumeData | null;
  baseHash: string | null;
  createdAt: number | null;
  sourceActionId?: string;
  message?: string;
  isPreviewOpen: boolean;
};

export type ResumeProposalDraftPayload = {
  source: ResumeProposalSource;
  baseSnapshot: ResumeData;
  proposalSnapshot: ResumeData;
  baseHash?: string;
  createdAt?: number;
  sourceActionId?: string;
  message?: string;
  openPreview?: boolean;
};

export type ResumeDiffModel = {
  changedBasicValues: string[];
  changedSectionIds: string[];
  changedItemIds: string[];
  changedRichTextSectionIds: string[];
  hasMetadataChanges: boolean;
};

export const createEmptyResumeProposalState = (): ResumeProposalState => ({
  status: "idle",
  source: null,
  baseSnapshot: null,
  proposalSnapshot: null,
  baseHash: null,
  createdAt: null,
  sourceActionId: undefined,
  message: undefined,
  isPreviewOpen: false,
});

export const hashResumeData = (resumeData: ResumeData | null | undefined) =>
  JSON.stringify(resumeData ?? null);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeText = (value: string) =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = <T extends string>(value: Record<string, unknown>, key: T): value is Record<T, unknown> =>
  Object.prototype.hasOwnProperty.call(value, key);

const collectBasicValueChanges = (base: ResumeData, proposal: ResumeData) => {
  const changedValues = new Set<string>();

  const compareValue = (nextValue: unknown, previousValue: unknown) => {
    if (!isNonEmptyString(nextValue)) return;
    if (nextValue === previousValue) return;
    changedValues.add(nextValue.trim());
  };

  compareValue(proposal.basics.name, base.basics.name);
  compareValue(proposal.basics.headline, base.basics.headline);
  compareValue(proposal.basics.email, base.basics.email);
  compareValue(proposal.basics.phone, base.basics.phone);
  compareValue(proposal.basics.location, base.basics.location);
  compareValue(proposal.basics.url.label, base.basics.url.label);
  compareValue(proposal.basics.url.href, base.basics.url.href);

  for (const field of proposal.basics.customFields) {
    const previousField = base.basics.customFields.find(
      (item: (typeof base.basics.customFields)[number]) => item.id === field.id,
    );
    compareValue(field.name, previousField?.name);
    compareValue(field.value, previousField?.value);
  }

  return [...changedValues];
};

const collectSectionChanges = (base: ResumeData, proposal: ResumeData) => {
  const changedSectionIds = new Set<string>();
  const changedRichTextSectionIds = new Set<string>();
  const changedItemIds = new Set<string>();

  const proposalSections = proposal.sections as Record<string, unknown>;
  const baseSections = base.sections as Record<string, unknown>;

  for (const [sectionKey, proposalSectionValue] of Object.entries(proposalSections)) {
    const baseSectionValue = baseSections[sectionKey];

    if (sectionKey === "custom" && isRecord(proposalSectionValue) && isRecord(baseSectionValue)) {
      for (const [customKey, proposalCustomSection] of Object.entries(proposalSectionValue)) {
        const baseCustomSection = baseSectionValue[customKey];
        if (!isRecord(proposalCustomSection) || !isRecord(baseCustomSection)) {
          continue;
        }

        const diff = collectSingleSectionChanges(baseCustomSection, proposalCustomSection);
        diff.changedSectionIds.forEach((id) => changedSectionIds.add(id));
        diff.changedRichTextSectionIds.forEach((id) => changedRichTextSectionIds.add(id));
        diff.changedItemIds.forEach((id) => changedItemIds.add(id));
      }

      continue;
    }

    if (!isRecord(proposalSectionValue) || !isRecord(baseSectionValue)) {
      continue;
    }

    const diff = collectSingleSectionChanges(baseSectionValue, proposalSectionValue);
    diff.changedSectionIds.forEach((id) => changedSectionIds.add(id));
    diff.changedRichTextSectionIds.forEach((id) => changedRichTextSectionIds.add(id));
    diff.changedItemIds.forEach((id) => changedItemIds.add(id));
  }

  return {
    changedSectionIds: [...changedSectionIds],
    changedRichTextSectionIds: [...changedRichTextSectionIds],
    changedItemIds: [...changedItemIds],
  };
};

const collectSingleSectionChanges = (
  baseSection: Record<string, unknown>,
  proposalSection: Record<string, unknown>,
) => {
  const changedSectionIds = new Set<string>();
  const changedRichTextSectionIds = new Set<string>();
  const changedItemIds = new Set<string>();
  const sectionId =
    typeof proposalSection.id === "string"
      ? proposalSection.id
      : typeof baseSection.id === "string"
        ? baseSection.id
        : null;

  if (sectionId === null) {
    return {
      changedSectionIds: [...changedSectionIds],
      changedRichTextSectionIds: [...changedRichTextSectionIds],
      changedItemIds: [...changedItemIds],
    };
  }

  const baseWithoutItems = { ...baseSection };
  const proposalWithoutItems = { ...proposalSection };
  delete baseWithoutItems.items;
  delete proposalWithoutItems.items;

  if (JSON.stringify(baseWithoutItems) !== JSON.stringify(proposalWithoutItems)) {
    changedSectionIds.add(sectionId);
  }

  if (hasOwn(proposalSection, "content")) {
    const nextContent = typeof proposalSection.content === "string" ? proposalSection.content : "";
    const previousContent = typeof baseSection.content === "string" ? baseSection.content : "";

    if (normalizeText(nextContent) !== normalizeText(previousContent)) {
      changedSectionIds.add(sectionId);
      changedRichTextSectionIds.add(sectionId);
    }
  }

  if (!Array.isArray(proposalSection.items) || !Array.isArray(baseSection.items)) {
    return {
      changedSectionIds: [...changedSectionIds],
      changedRichTextSectionIds: [...changedRichTextSectionIds],
      changedItemIds: [...changedItemIds],
    };
  }

  const baseItems = new Map(
    baseSection.items
      .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.id === "string")
      .map((item) => [item.id as string, item]),
  );

  for (const proposalItem of proposalSection.items) {
    if (!isRecord(proposalItem) || typeof proposalItem.id !== "string") {
      continue;
    }

    const baseItem = baseItems.get(proposalItem.id);
    if (!baseItem || JSON.stringify(baseItem) !== JSON.stringify(proposalItem)) {
      changedSectionIds.add(sectionId);
      changedItemIds.add(proposalItem.id);

      if (hasOwn(proposalItem, "summary") || hasOwn(proposalItem, "description")) {
        changedRichTextSectionIds.add(sectionId);
      }
    }
  }

  if (baseSection.items.length !== proposalSection.items.length) {
    changedSectionIds.add(sectionId);
  }

  return {
    changedSectionIds: [...changedSectionIds],
    changedRichTextSectionIds: [...changedRichTextSectionIds],
    changedItemIds: [...changedItemIds],
  };
};

export const createResumeDiffModel = (
  base: ResumeData | null | undefined,
  proposal: ResumeData | null | undefined,
): ResumeDiffModel => {
  if (!base || !proposal) {
    return {
      changedBasicValues: [],
      changedSectionIds: [],
      changedItemIds: [],
      changedRichTextSectionIds: [],
      hasMetadataChanges: false,
    };
  }

  const sectionChanges = collectSectionChanges(base, proposal);

  return {
    changedBasicValues: collectBasicValueChanges(base, proposal),
    ...sectionChanges,
    hasMetadataChanges: JSON.stringify(base.metadata) !== JSON.stringify(proposal.metadata),
  };
};
