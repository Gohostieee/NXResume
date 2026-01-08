"use client";

import Link from "next/link";
import { ArrowLeft, FloppyDisk, Check, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { LeftSidebar } from "./sidebars/left/left-sidebar";
import { RightSidebar } from "./sidebars/right/right-sidebar";
import { PreviewPanel } from "./preview-panel";
import { AutoSave } from "./auto-save";
import { useResumeStore } from "@/stores/resume";
import { useAutoSaveStore } from "@/stores/auto-save";

type BuilderLayoutProps = {
  resume: any;
};

export function BuilderLayout({ resume }: BuilderLayoutProps) {
  const resumeData = useResumeStore((state) => state.resume);
  const isSaving = useAutoSaveStore((state) => state.isSaving);
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);

  const handleSave = async () => {
    await triggerSave();
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Auto-save component */}
      <AutoSave />

      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/resumes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">{resumeData?.title || resume.title}</h1>
            <p className="flex items-center gap-1.5 text-xs text-foreground/60">
              {isSaving ? (
                <>
                  <CircleNotch className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  Auto-save enabled
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {resume.locked && (
            <span className="text-sm text-warning">Locked</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <FloppyDisk className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Resume Data */}
        <LeftSidebar />

        {/* Center - Preview */}
        <PreviewPanel />

        {/* Right Sidebar - Settings */}
        <RightSidebar />
      </div>
    </div>
  );
}
