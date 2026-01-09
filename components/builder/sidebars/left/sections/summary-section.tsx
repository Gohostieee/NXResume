"use client";

import { CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { RichInput } from "@/components/ui/rich-input";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/stores/resume";
import { SectionOptions } from "./section-options";

export const SummarySection = () => {
  const setValue = useResumeStore((state) => state.setValue);
  const section = useResumeStore((state) => state.resume.data.sections.summary);

  const collapsed = useResumeStore((state) => state.collapsedSections.summary ?? false);
  const toggleCollapseSection = useResumeStore((state) => state.toggleCollapseSection);

  return (
    <section id="summary" className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            aria-label={collapsed ? "Expand section" : "Collapse section"}
            onClick={() => {
              toggleCollapseSection("summary");
            }}
          >
            <CaretRight className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-90")} />
          </Button>
          <h3 className="font-semibold">{section.name}</h3>
        </div>
        <SectionOptions id="summary" />
      </header>

      {!collapsed && (
        <div className={cn(!section.visible && "opacity-50")}>
          <RichInput
            content={section.content}
            onChange={(value) => {
              setValue("sections.summary.content", value);
            }}
          />
        </div>
      )}
    </section>
  );
};
