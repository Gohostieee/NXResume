"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Check, CircleNotch, FileText, PencilSimple, Sparkle } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { editResumeWithAi } from "@/lib/ai/resume-editor-client";
import { DEFAULT_MODEL } from "@/constants/llm";
import { useAutoSaveStore } from "@/stores/auto-save";
import { useOpenAiStore } from "@/stores/openai";
import { useResumeStore } from "@/stores/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ApplicationContext = {
  _id: string;
  title: string;
  company: string;
  categories?: string[];
  jobDescription: string;
};

type PresetAction = {
  id: "light_edit" | "cut_focus" | "keywords" | "role_pivot" | "overhaul";
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  buildInstruction: (input: { targetRole: string }) => string;
};

const TARGET_ROLE_OPTIONS = [
  { value: "software engineer", label: "Software Engineer" },
  { value: "sales representative", label: "Sales Representative" },
  { value: "account executive", label: "Account Executive" },
  { value: "product manager", label: "Product Manager" },
  { value: "marketing manager", label: "Marketing Manager" },
  { value: "customer success manager", label: "Customer Success" },
  { value: "operations manager", label: "Operations" },
  { value: "data analyst", label: "Data Analyst" },
  { value: "custom", label: "Custom Role" },
] as const;

const ACTIONS: PresetAction[] = [
  {
    id: "light_edit",
    title: "Light Edit",
    description: "Tighten wording, improve grammar, and keep existing structure.",
    impact: "low",
    buildInstruction: () =>
      "Apply a light polish only. Keep structure and meaning intact, improve clarity and grammar, and avoid major rewrites.",
  },
  {
    id: "cut_focus",
    title: "Cut + Focus",
    description: "Remove low-value content and keep the most relevant, measurable impact.",
    impact: "medium",
    buildInstruction: () =>
      "Trim low-relevance content for this application. Keep high-impact bullets, remove repetition, and keep the resume concise.",
  },
  {
    id: "keywords",
    title: "Keyword Match",
    description: "Align resume wording to the job posting while keeping it natural.",
    impact: "medium",
    buildInstruction: () =>
      "Optimize wording and section content to align with the job description keywords and categories. Keep language natural and truthful.",
  },
  {
    id: "role_pivot",
    title: "Role Pivot",
    description: "Reframe experience toward a target role profile.",
    impact: "high",
    buildInstruction: ({ targetRole }) =>
      `Pivot this resume toward a ${targetRole} role. Rewrite summaries, highlights, and skills emphasis to match that role while staying factual.`,
  },
  {
    id: "overhaul",
    title: "Full Overhaul",
    description: "Rebuild the resume narrative for this job from top to bottom.",
    impact: "high",
    buildInstruction: ({ targetRole }) =>
      `Perform a full rewrite to tailor this resume to the attached job${targetRole ? ` and target role ${targetRole}` : ""}. Keep all claims factual and improve relevance, clarity, and impact.`,
  },
];

const getImpactBadge = (impact: PresetAction["impact"]) => {
  if (impact === "low") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (impact === "medium") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-rose-100 text-rose-900 border-rose-200";
};

export function AiActionsTab({
  application,
  enabled,
}: {
  application: ApplicationContext | null | undefined;
  enabled: boolean;
}) {
  const resume = useResumeStore((state) => state.resume);
  const setResumeData = useResumeStore((state) => state.setResumeData);
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);
  const { apiKey, model, maxTokens, baseURL } = useOpenAiStore();
  const careerProfile = useQuery(api.careerProfiles.getCurrentProfile);

  const [activeAction, setActiveAction] = useState<PresetAction["id"] | null>(null);
  const [lastActionTitle, setLastActionTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [targetRolePreset, setTargetRolePreset] = useState<string>("software engineer");
  const [customRole, setCustomRole] = useState("");

  const hasResume = Boolean(resume?.data);
  const isLocked = Boolean(resume?.locked);
  const canUseAi = enabled && Boolean(application) && hasResume && !isLocked;

  const resolvedTargetRole = useMemo(() => {
    if (targetRolePreset === "custom") {
      return customRole.trim();
    }
    return targetRolePreset;
  }, [customRole, targetRolePreset]);

  const runInstruction = async (instruction: string, actionTitle: string, actionId: PresetAction["id"]) => {
    if (!canUseAi || !resume?.data || !application) return;

    setError(null);
    setActiveAction(actionId);

    try {
      const updatedData = await editResumeWithAi({
        resume: resume.data,
        instruction,
        profile: careerProfile ?? undefined,
        application: {
          id: application._id,
          title: application.title,
          company: application.company,
          categories: application.categories ?? [],
          jobDescription: application.jobDescription,
        },
        apiKey: apiKey ?? undefined,
        model: model ?? DEFAULT_MODEL,
        maxTokens,
        baseURL,
      });

      setResumeData(updatedData);
      await triggerSave();
      setLastActionTitle(actionTitle);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to apply AI action.";
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handlePresetAction = async (action: PresetAction) => {
    if (!canUseAi) return;

    const requiredRole = action.id === "role_pivot" || action.id === "overhaul";
    if (requiredRole && !resolvedTargetRole) {
      setError("Choose a target role before running this action.");
      return;
    }

    const instruction = action.buildInstruction({ targetRole: resolvedTargetRole });
    await runInstruction(instruction, action.title, action.id);
  };

  const handleCustomPrompt = async () => {
    if (!canUseAi) return;

    const trimmed = customPrompt.trim();
    if (!trimmed) {
      setError("Add a custom prompt before running this action.");
      return;
    }

    await runInstruction(trimmed, "Custom Prompt", "overhaul");
  };

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-foreground/70">
        AI Actions are available only for resumes attached to job applications.
      </div>
    );
  }

  if (!application) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-foreground/70">
        This tailored resume has no linked application context yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sky-50 via-background to-emerald-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-foreground/60">Job Context</p>
            <h3 className="text-base font-semibold">
              {application.title} at {application.company}
            </h3>
          </div>
          <div className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
            Tailored AI
          </div>
        </div>

        {application.categories && application.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {application.categories.slice(0, 8).map((category) => (
              <span
                key={category}
                className="rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[11px] text-foreground/80"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border p-3">
        <Label htmlFor="target-role" className="text-xs uppercase tracking-wide text-foreground/60">
          Target Role Preset
        </Label>
        <div className="mt-2 space-y-2">
          <Select value={targetRolePreset} onValueChange={setTargetRolePreset}>
            <SelectTrigger id="target-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {targetRolePreset === "custom" && (
            <Input
              value={customRole}
              onChange={(event) => setCustomRole(event.target.value)}
              placeholder="Type a custom role, e.g. Enterprise Sales"
            />
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {ACTIONS.map((action) => {
          const isRunning = activeAction === action.id;

          return (
            <div key={action.id} className="rounded-xl border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{action.title}</div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getImpactBadge(action.impact)}`}>
                      {action.impact}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/70">{action.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canUseAi || isRunning || Boolean(activeAction)}
                  onClick={() => void handlePresetAction(action)}
                >
                  {isRunning ? (
                    <CircleNotch className="mr-1 h-4 w-4 animate-spin" />
                  ) : action.impact === "high" ? (
                    <Sparkle className="mr-1 h-4 w-4" />
                  ) : (
                    <PencilSimple className="mr-1 h-4 w-4" />
                  )}
                  Run
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" />
          Create from Prompt
        </div>
        <Textarea
          value={customPrompt}
          onChange={(event) => setCustomPrompt(event.target.value)}
          placeholder="Example: Rebuild this as a sales resume for SMB SaaS, emphasize quota attainment, pipeline generation, and customer retention."
          rows={4}
          disabled={!canUseAi || Boolean(activeAction)}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-foreground/60">Best for major rewrites and role changes.</p>
          <Button
            size="sm"
            disabled={!canUseAi || Boolean(activeAction)}
            onClick={() => void handleCustomPrompt()}
          >
            {activeAction ? <CircleNotch className="mr-1 h-4 w-4 animate-spin" /> : <Sparkle className="mr-1 h-4 w-4" />}
            Apply Prompt
          </Button>
        </div>
      </div>

      {!isLocked ? (
        <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-xs text-foreground/70">
          AI changes are applied directly to this tailored resume and auto-saved.
        </div>
      ) : (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          This resume is locked. Unlock it to run AI actions.
        </div>
      )}

      {lastActionTitle && !error && !activeAction && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <Check className="h-4 w-4" />
          Last action applied: {lastActionTitle}
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
    </div>
  );
}
