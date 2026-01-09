"use client";

import { useMemo, useState } from "react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsOutCardinal,
  CircleNotch,
  ClockClockwise,
  CubeFocus,
  FilePdf,
  Hash,
  LineSegment,
  LinkSimple,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { saveAs } from "file-saver";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { useBuilderStore } from "@/stores/builder";
import { useResumeStore, useTemporalResumeStore } from "@/stores/resume";

export const BuilderToolbar = () => {
  const [panMode, setPanMode] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const setValue = useResumeStore((state) => state.setValue);
  const undo = useTemporalResumeStore((state) => state.undo);
  const redo = useTemporalResumeStore((state) => state.redo);
  const resume = useResumeStore((state) => state.resume);

  const frameRef = useBuilderStore((state) => state.frame.ref);
  const currentUser = useQuery(api.users.getCurrentUser);
  const incrementDownloads = useMutation(api.statistics.incrementDownloads);

  const resumeId = resume?.id || resume?._id;
  const isPublic = resume?.visibility === "public";
  const pageOptions = resume?.data?.metadata?.page?.options;

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const publicUrl = currentUser?.username
    ? `${origin}/${currentUser.username}/${resume?.slug || ""}`
    : "";

  const sendMessage = (payload: Record<string, unknown>) => {
    if (!frameRef?.contentWindow) return;
    frameRef.contentWindow.postMessage(payload, window.location.origin);
  };

  const onPrint = async () => {
    if (!resumeId) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/resume/${resumeId}/print`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      saveAs(blob, `resume-${resumeId}.pdf`);

      if (isPublic && resumeId) {
        incrementDownloads({ resumeId: resumeId as Id<"resumes"> }).catch((error) => {
          console.error("Failed to increment downloads:", error);
        });
      }
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const onCopy = async () => {
    if (!isPublic || !publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-20 hidden justify-center md:flex">
      <div className="inline-flex items-center rounded-full border bg-background px-4 py-2 shadow-lg">
        <Tooltip content="Undo">
          <Button size="icon" variant="ghost" className="rounded-none" onClick={() => undo()}>
            <ArrowCounterClockwise className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Redo">
          <Button size="icon" variant="ghost" className="rounded-none" onClick={() => redo()}>
            <ArrowClockwise className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Tooltip content={panMode ? "Scroll to Pan" : "Scroll to Zoom"}>
          <Toggle
            className="rounded-none"
            pressed={panMode}
            onPressedChange={() => {
              const next = !panMode;
              setPanMode(next);
              sendMessage({ type: "TOGGLE_PAN_MODE", panMode: next });
            }}
          >
            {panMode ? <ArrowsOutCardinal className="h-4 w-4" /> : <MagnifyingGlass className="h-4 w-4" />}
          </Toggle>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Tooltip content="Zoom In">
          <Button size="icon" variant="ghost" className="rounded-none" onClick={() => sendMessage({ type: "ZOOM_IN" })}>
            <MagnifyingGlassPlus className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Zoom Out">
          <Button size="icon" variant="ghost" className="rounded-none" onClick={() => sendMessage({ type: "ZOOM_OUT" })}>
            <MagnifyingGlassMinus className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Reset Zoom">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-none"
            onClick={() => sendMessage({ type: "RESET_VIEW" })}
          >
            <ClockClockwise className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Center Artboard">
          <Button size="icon" variant="ghost" className="rounded-none" onClick={() => sendMessage({ type: "CENTER_VIEW" })}>
            <CubeFocus className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Tooltip content="Toggle Page Break Line">
          <Toggle
            className="rounded-none"
            pressed={pageOptions?.breakLine ?? true}
            onPressedChange={(pressed) => {
              setValue("metadata.page.options.breakLine", pressed);
            }}
          >
            <LineSegment className="h-4 w-4" />
          </Toggle>
        </Tooltip>

        <Tooltip content="Toggle Page Numbers">
          <Toggle
            className="rounded-none"
            pressed={pageOptions?.pageNumbers ?? true}
            onPressedChange={(pressed) => {
              setValue("metadata.page.options.pageNumbers", pressed);
            }}
          >
            <Hash className="h-4 w-4" />
          </Toggle>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Tooltip content="Copy Link to Resume">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-none"
            disabled={!isPublic || !publicUrl}
            onClick={onCopy}
          >
            <LinkSimple className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Download PDF">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-none"
            disabled={isDownloading || !resumeId}
            onClick={onPrint}
          >
            {isDownloading ? <CircleNotch className="h-4 w-4 animate-spin" /> : <FilePdf className="h-4 w-4" />}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
