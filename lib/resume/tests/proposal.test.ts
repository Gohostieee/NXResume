import { describe, expect, it } from "vitest";
import { defaultExperience, defaultResumeData } from "../../schema";
import { createResumeDiffModel, hashResumeData } from "../proposal";

const cloneResume = () => JSON.parse(JSON.stringify(defaultResumeData));

describe("createResumeDiffModel", () => {
  it("returns no changes for identical resumes", () => {
    const base = cloneResume();
    const proposal = cloneResume();

    expect(createResumeDiffModel(base, proposal)).toEqual({
      changedBasicValues: [],
      changedSectionIds: [],
      changedItemIds: [],
      changedRichTextSectionIds: [],
      hasMetadataChanges: false,
    });
  });

  it("tracks changed basics text values", () => {
    const base = cloneResume();
    const proposal = cloneResume();
    proposal.basics.name = "Jane Candidate";
    proposal.basics.headline = "Senior Product Designer";

    const diff = createResumeDiffModel(base, proposal);

    expect(diff.changedBasicValues).toContain("Jane Candidate");
    expect(diff.changedBasicValues).toContain("Senior Product Designer");
  });

  it("tracks rich text summary changes", () => {
    const base = cloneResume();
    const proposal = cloneResume();
    base.sections.summary.content = "<p>Built internal tools.</p>";
    proposal.sections.summary.content = "<p>Built internal tools and launched AI workflows.</p>";

    const diff = createResumeDiffModel(base, proposal);

    expect(diff.changedSectionIds).toContain(proposal.sections.summary.id);
    expect(diff.changedRichTextSectionIds).toContain(proposal.sections.summary.id);
  });

  it("tracks changed item blocks by stable id", () => {
    const base = cloneResume();
    const proposal = cloneResume();
    const item = {
      ...defaultExperience,
      id: "experience-1",
    };

    base.sections.experience.items = [
      {
        ...item,
        company: "Acme",
        summary: "<p>Shipped product features.</p>",
      },
    ];
    proposal.sections.experience.items = [
      {
        ...item,
        company: "Acme AI",
        summary: "<p>Shipped product features and AI copilots.</p>",
      },
    ];

    const diff = createResumeDiffModel(base, proposal);

    expect(diff.changedSectionIds).toContain(proposal.sections.experience.id);
    expect(diff.changedItemIds).toContain(item.id);
  });

  it("tracks metadata changes separately", () => {
    const base = cloneResume();
    const proposal = cloneResume();
    proposal.metadata.page.margin = 24;

    expect(createResumeDiffModel(base, proposal).hasMetadataChanges).toBe(true);
  });
});

describe("hashResumeData", () => {
  it("changes when the resume payload changes", () => {
    const base = cloneResume();
    const proposal = cloneResume();
    proposal.basics.name = "Different Name";

    expect(hashResumeData(base)).not.toEqual(hashResumeData(proposal));
  });
});
