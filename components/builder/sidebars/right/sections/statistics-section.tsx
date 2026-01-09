"use client";

import { Info } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/stores/resume";

export const StatisticsSection = () => {
  const resume = useResumeStore((state) => state.resume);
  const resumeId = resume?.id || resume?._id;
  const isPublic = resume?.visibility === "public";

  const stats = useQuery(
    api.statistics.getByResumeId,
    resumeId ? { resumeId: resumeId as Id<"resumes"> } : "skip",
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Statistics</h4>

      {!isPublic && (
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertTitle>Statistics are available only for public resumes.</AlertTitle>
          <AlertDescription className="text-xs">
            Enable public sharing to track views and downloads.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className={cn("text-3xl font-bold transition-all", !isPublic && "blur-sm")}>
            {stats?.views ?? 0}
          </h3>
          <p className="text-sm text-muted-foreground">Views</p>
        </div>
        <div>
          <h3 className={cn("text-3xl font-bold transition-all", !isPublic && "blur-sm")}>
            {stats?.downloads ?? 0}
          </h3>
          <p className="text-sm text-muted-foreground">Downloads</p>
        </div>
      </div>
    </div>
  );
};
