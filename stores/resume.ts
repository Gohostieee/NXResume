import { createId } from "@paralleldrive/cuid2";
import type { CustomSectionGroup, ResumeData, SectionKey } from "@/lib/schema";
import { defaultSection } from "@/lib/schema";
import { removeItemInLayout } from "@/lib/utils";
import _set from "lodash.set";
import type { TemporalState } from "zundo";
import { temporal } from "zundo";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useStoreWithEqualityFn } from "zustand/traditional";

// Resume document type (combining data with metadata)
type Resume = {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  data: ResumeData;
  visibility: "public" | "private";
  locked: boolean;
  userId: string;
  createdAt: number;
  updatedAt: number;
};

type ResumeStore = {
  resume: Resume;

  // Actions
  setResume: (resume: Resume) => void;
  setResumeData: (data: ResumeData) => void;
  setValue: (path: string, value: unknown) => void;

  // Custom Section Actions
  addSection: () => void;
  removeSection: (sectionId: SectionKey) => void;

  // Section Collapsed/Expanded State
  collapsedSections: Record<string, boolean | undefined>;
  toggleCollapseSection: (id: string) => void;
  expandAllSections: () => void;
  collapseAllSections: () => void;
};

export const useResumeStore = create<ResumeStore>()(
  temporal(
    immer((set) => ({
      resume: {} as Resume,
      setResume: (resume) => {
        const normalizedResume = {
          ...resume,
          id: resume.id || resume._id || "",
        };
        set({ resume: normalizedResume });
      },
      setResumeData: (data) => {
        set((state) => {
          state.resume.data = data;
        });
      },
      setValue: (path, value) => {
        set((state) => {
          if (path === "visibility") {
            state.resume.visibility = value as "public" | "private";
          } else {
            state.resume.data = _set(state.resume.data, path, value);
          }
        });
      },
      addSection: () => {
        const section: CustomSectionGroup = {
          ...defaultSection,
          id: createId(),
          name: "Custom Section",
          items: [],
        };

        set((state) => {
          const lastPageIndex = state.resume.data.metadata.layout.length - 1;
          state.resume.data.metadata.layout[lastPageIndex][0].push(`custom.${section.id}`);
          state.resume.data = _set(state.resume.data, `sections.custom.${section.id}`, section);
        });
      },
      removeSection: (sectionId: SectionKey) => {
        if (sectionId.startsWith("custom.")) {
          const id = sectionId.split("custom.")[1];

          set((state) => {
            removeItemInLayout(sectionId, state.resume.data.metadata.layout);
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete state.resume.data.sections.custom[id];
          });
        }
      },
      collapsedSections: {},
      toggleCollapseSection: (id) => {
        set((state) => {
          state.collapsedSections[id] = !state.collapsedSections[id];
        });
      },
      expandAllSections: () => {
        set((state) => {
          state.collapsedSections = {};
        });
      },
      collapseAllSections: () => {
        set((state) => {
          const collapsed: Record<string, boolean> = { basics: true };
          for (const section of Object.keys(state.resume.data.sections)) {
            collapsed[section] = true;
          }
          // Add any custom sections to the collapsed state
          for (const section of Object.keys(state.resume.data.sections.custom)) {
            collapsed[`custom.${section}`] = true;
          }
          state.collapsedSections = collapsed;
        });
      },
    })),
    {
      limit: 100,
      wrapTemporal: (fn) => devtools(fn),
      partialize: ({ resume }) => ({ resume }),
    },
  ),
);

export const useTemporalResumeStore = <T>(
  selector: (state: TemporalState<Pick<ResumeStore, "resume">>) => T,
  equality?: (a: T, b: T) => boolean,
) => useStoreWithEqualityFn(useResumeStore.temporal, selector, equality);
