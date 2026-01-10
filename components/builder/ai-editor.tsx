"use client";

import { CircleNotch, PaperPlaneRight, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_MODEL } from "@/constants/llm";
import { editResumeWithAi } from "@/lib/ai/resume-editor-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAutoSaveStore } from "@/stores/auto-save";
import { useOpenAiStore } from "@/stores/openai";
import { useResumeStore } from "@/stores/resume";

export const AiEditor = () => {
  const resume = useResumeStore((state) => state.resume);
  const setResumeData = useResumeStore((state) => state.setResumeData);
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);
  const { apiKey, model, maxTokens, baseURL } = useOpenAiStore();
  const careerProfile = useQuery(api.careerProfiles.getCurrentProfile);

  const [instruction, setInstruction] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [lastAiMessage, setLastAiMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const isLocked = Boolean(resume?.locked);
  const hasResume = Boolean(resume?.data);
  const trimmedInstruction = instruction.trim();
  const canSubmit = !isRunning && trimmedInstruction.length > 0 && hasResume && !isLocked;
  const hasKey = Boolean(apiKey && apiKey.trim().length > 0);

  const handleClear = () => {
    setInstruction("");
    setLastUserMessage(null);
    setLastAiMessage(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !resume?.data) return;

    setIsRunning(true);
    setError(null);
    setLastUserMessage(trimmedInstruction);
    setInstruction("");

    try {
      const updatedData = await editResumeWithAi({
        resume: resume.data,
        instruction: trimmedInstruction,
        profile: careerProfile ?? undefined,
        apiKey: apiKey ?? undefined,
        model: model ?? DEFAULT_MODEL,
        maxTokens,
        baseURL,
      });

      setResumeData(updatedData);

      setLastAiMessage("Done. Your resume is updated with the latest changes.");
      await triggerSave();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to edit the resume.";
      setError(message);
      setLastAiMessage("Sorry, I could not apply that change. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
        <div className="flex items-center gap-2">
          <span>Model: {model ?? DEFAULT_MODEL}</span>
          {!hasResume && <span className="text-foreground/60">Resume is still loading.</span>}
          {isLocked && <span className="text-error">Resume is locked.</span>}
          {!hasKey && (
            <span>
              No API key saved. Add one in{" "}
              <Link href="/dashboard/settings" className="underline">
                Settings
              </Link>
              , or rely on a server key if configured.
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-md border bg-secondary/30 px-2 py-1.5">
          <div className="text-[11px] font-semibold uppercase text-foreground/60">You</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-foreground">
            {lastUserMessage ?? "No message yet."}
          </div>
        </div>
        <div className="rounded-md border bg-secondary/20 px-2 py-1.5">
          <div className="text-[11px] font-semibold uppercase text-foreground/60">AI</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-foreground">
            {isRunning ? "Working on it..." : lastAiMessage ?? "No response yet."}
          </div>
        </div>
      </div>

      <Textarea
        value={instruction}
        placeholder="Tell the AI what to change, for example: Improve my summary, make it concise, and add impact."
        className="min-h-[64px]"
        disabled={isRunning || !hasResume || isLocked}
        onChange={(event) => setInstruction(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/60">
        <span>Press Ctrl+Enter to run.</span>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleClear} disabled={isRunning}>
            <Trash className="mr-1 h-4 w-4" />
            Clear
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            {isRunning ? <CircleNotch className="mr-1 h-4 w-4 animate-spin" /> : <PaperPlaneRight className="mr-1 h-4 w-4" />}
            {isRunning ? "Applying" : "Apply"}
          </Button>
        </div>
      </div>

      {error && <div className="text-xs text-error">{error}</div>}
    </div>
  );
};
