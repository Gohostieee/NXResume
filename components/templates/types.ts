import type { SectionKey } from "@reactive-resume/schema";

export type TemplateProps = {
  columns: [SectionKey[], SectionKey[]];
  isFirstPage?: boolean;
};
