"use client";

import Link from "next/link";
import { ArrowLeft, Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAutoSaveStore } from "@/stores/auto-save";
import { useBuilderStore } from "@/stores/builder";
import { useResumeStore } from "@/stores/resume";

export const BuilderHeader = () => {
  const title = useResumeStore((state) => state.resume.title);
  const locked = useResumeStore((state) => state.resume.locked);
  const isSaving = useAutoSaveStore((state) => state.isSaving);

  const toggle = useBuilderStore((state) => state.toggle);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          className="lg:hidden"
          onClick={() => toggle("left")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Link href="/dashboard/resumes" className="hidden lg:flex">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div>
          <h1 className="font-semibold">{title || "Resume"}</h1>
          <p className="text-xs text-foreground/60">
            {isSaving ? "Saving..." : "Auto-save enabled"}
          </p>
        </div>

        {locked && (
          <div className="flex items-center gap-1 text-xs text-warning">
            <Lock className="h-3 w-3" />
            Locked
          </div>
        )}
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="lg:hidden"
        onClick={() => toggle("right")}
      >
        <ArrowLeft className="h-4 w-4 rotate-180" />
      </Button>
    </header>
  );
};
