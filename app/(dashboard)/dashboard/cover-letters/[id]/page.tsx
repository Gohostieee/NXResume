"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Eye,
  EyeSlash,
  FloppyDisk,
  LinkSimple,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { type AiQueueItem } from "@/lib/ai/queue-types";
import { COVER_LETTER_MODULE_LABELS, COVER_LETTER_PRESET_LABELS } from "@/lib/ai/cover-letter-types";
import { AI_LOADING_PRESETS } from "@/lib/ai/loading-presets";
import { AiLoadingState } from "@/components/ui/ai-loading-state";
import { RichInput } from "@/components/ui/rich-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpenAiStore } from "@/stores/openai";

type Notice = {
  variant: "success" | "warning" | "error" | "info";
  title: string;
  description: string;
};

const htmlToText = (html: string) => {
  if (typeof window === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim();
};

const isNormalizedVersion = (
  version: { version?: number; contentHtml?: string; contentText?: string },
): version is { _id: string; version: number; contentHtml: string; contentText: string } =>
  typeof version.version === "number" &&
  typeof version.contentHtml === "string" &&
  typeof version.contentText === "string";

const getActiveQueueItem = (items: AiQueueItem[]) =>
  items.find((item) => item.status === "queued" || item.status === "running") ?? null;

const getFailedQueueItem = (items: AiQueueItem[]) =>
  items.find((item) => item.status === "failed") ?? null;

export default function CoverLetterEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const coverLetter = useQuery(api.coverLetters.getById, {
    id: params.id as any,
  });
  const profileContext = useQuery(api.careerProfiles.getContext);
  const queueItems =
    useQuery(api.aiQueue.listForTarget, {
      targetType: "cover_letter",
      targetId: params.id,
    }) ?? [];
  const currentUser = useQuery(api.users.getCurrentUser);
  const saveEdit = useMutation(api.coverLetters.saveEdit);
  const setVisibility = useMutation(api.coverLetters.setVisibility);
  const clearGenerationFailure = useMutation(api.coverLetters.clearGenerationFailure);
  const removeCoverLetter = useMutation(api.coverLetters.remove);
  const enqueueAiAction = useMutation(api.aiQueue.enqueue);
  const dismissQueueItem = useMutation(api.aiQueue.dismiss);
  const { model, maxTokens } = useOpenAiStore();

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isQueueingRegeneration, setIsQueueingRegeneration] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isDismissingFailure, setIsDismissingFailure] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const lastSeenActiveVersionRef = useRef<number | null>(null);

  const normalizedVersions = useMemo(() => {
    if (!coverLetter) return [];
    return coverLetter.versions.filter(isNormalizedVersion);
  }, [coverLetter]);

  const activeQueueItem = useMemo(() => getActiveQueueItem(queueItems), [queueItems]);
  const failedQueueItem = useMemo(() => getFailedQueueItem(queueItems), [queueItems]);
  const isGenerationPending =
    coverLetter?.generationState === "queued" ||
    coverLetter?.generationState === "running" ||
    Boolean(activeQueueItem);

  const selectedVersionData = useMemo(() => {
    if (!coverLetter || selectedVersion === null) return null;
    return normalizedVersions.find((version) => version.version === selectedVersion) ?? null;
  }, [coverLetter, normalizedVersions, selectedVersion]);

  const isViewingActiveVersion =
    coverLetter !== null &&
    coverLetter !== undefined &&
    selectedVersion !== null &&
    selectedVersion === coverLetter.activeVersion;

  const isDirty =
    Boolean(coverLetter) &&
    isViewingActiveVersion &&
    Boolean(selectedVersionData) &&
    (title !== coverLetter.title || editorHtml !== selectedVersionData?.contentHtml);

  useEffect(() => {
    if (!coverLetter) return;

    setTitle(coverLetter.title);

    if (lastSeenActiveVersionRef.current !== coverLetter.activeVersion) {
      lastSeenActiveVersionRef.current = coverLetter.activeVersion;
      setSelectedVersion(coverLetter.activeVersion > 0 ? coverLetter.activeVersion : null);
    } else if (selectedVersion === null && coverLetter.activeVersion > 0) {
      setSelectedVersion(coverLetter.activeVersion);
    }

    const resolvedVersion =
      selectedVersion !== null && normalizedVersions.some((version) => version.version === selectedVersion)
        ? selectedVersion
        : coverLetter.activeVersion > 0
          ? coverLetter.activeVersion
          : null;

    if (resolvedVersion === null) {
      setEditorHtml("");
      return;
    }

    const resolvedVersionData =
      normalizedVersions.find((version) => version.version === resolvedVersion) ??
      (coverLetter.activeVersionData && isNormalizedVersion(coverLetter.activeVersionData)
        ? coverLetter.activeVersionData
        : null);

    if (resolvedVersionData) {
      setEditorHtml(resolvedVersionData.contentHtml ?? "");
    }
  }, [coverLetter, normalizedVersions, selectedVersion]);

  const publicUrl = useMemo(() => {
    if (!coverLetter || !currentUser?.username) return "";
    if (typeof window === "undefined") return "";

    return `${window.location.origin}/${currentUser.username}/letters/${coverLetter.slug}`;
  }, [coverLetter, currentUser?.username]);

  const activeStagePreset = activeQueueItem
    ? AI_LOADING_PRESETS[activeQueueItem.stagePreset]
    : coverLetter?.activeVersion && coverLetter.activeVersion > 0
      ? AI_LOADING_PRESETS.coverLetterRegenerate
      : AI_LOADING_PRESETS.coverLetterCreate;
  const activeStageIndex = activeQueueItem?.stageIndex ?? 0;

  const handleCopyLink = async () => {
    if (!publicUrl || !coverLetter || coverLetter.visibility !== "public") return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setNotice({
        variant: "success",
        title: "Link copied",
        description: "Public cover letter URL copied to clipboard.",
      });
    } catch {
      setNotice({
        variant: "error",
        title: "Copy failed",
        description: "Could not copy URL to clipboard.",
      });
    }
  };

  const handleSave = async () => {
    if (!coverLetter || !isViewingActiveVersion || isGenerationPending) return;

    setIsSaving(true);
    try {
      await saveEdit({
        id: coverLetter._id,
        title: title.trim() || coverLetter.title,
        contentHtml: editorHtml,
        contentText: htmlToText(editorHtml),
      });

      setNotice({
        variant: "success",
        title: "Saved",
        description: "Cover letter changes were saved.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save the cover letter.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!coverLetter) return;
    if (isGenerationPending) return;

    if (isDirty) {
      setNotice({
        variant: "warning",
        title: "Save changes first",
        description: "Save the current version before queueing regeneration.",
      });
      return;
    }

    if (!isViewingActiveVersion || coverLetter.activeVersion <= 0) {
      setNotice({
        variant: "warning",
        title: "Open the active version",
        description: "Switch to the active version before queueing regeneration.",
      });
      return;
    }

    setIsQueueingRegeneration(true);
    try {
      if (coverLetter.generationState === "failed") {
        await clearGenerationFailure({ id: coverLetter._id });
      }

      if (failedQueueItem) {
        await dismissQueueItem({ actionId: failedQueueItem._id as any }).catch(() => null);
      }

      await enqueueAiAction({
        request: {
          kind: "cover_letter.generate",
          coverLetterId: coverLetter._id as any,
          mode: "regenerate",
          sourceVersion: coverLetter.activeVersion,
          model: model ?? undefined,
          maxTokens: maxTokens ?? undefined,
        },
      });

      setNotice({
        variant: "success",
        title: "Regeneration queued",
        description: "A new version is being generated from the active draft.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Regeneration failed",
        description:
          error instanceof Error ? error.message : "Could not queue a new cover letter version.",
      });
    } finally {
      setIsQueueingRegeneration(false);
    }
  };

  const handleDismissFailure = async () => {
    if (!coverLetter) return;

    setIsDismissingFailure(true);
    try {
      await clearGenerationFailure({ id: coverLetter._id });
      if (failedQueueItem) {
        await dismissQueueItem({ actionId: failedQueueItem._id as any }).catch(() => null);
      }
    } finally {
      setIsDismissingFailure(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!coverLetter) return;
    if (!confirm("Delete this cover letter draft?")) return;

    setIsDeletingDraft(true);
    try {
      await removeCoverLetter({ id: coverLetter._id });
      router.push("/dashboard/applications");
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete this draft.",
      });
    } finally {
      setIsDeletingDraft(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!coverLetter || isGenerationPending) return;

    const nextVisibility = coverLetter.visibility === "public" ? "private" : "public";

    setIsUpdatingVisibility(true);
    try {
      await setVisibility({
        id: coverLetter._id,
        visibility: nextVisibility,
      });

      setNotice({
        variant: "success",
        title: "Visibility updated",
        description:
          nextVisibility === "public"
            ? "Cover letter is now public."
            : "Cover letter is now private.",
      });
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Visibility update failed",
        description:
          error instanceof Error ? error.message : "Could not update visibility.",
      });
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  if (coverLetter === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground/60">Loading cover letter...</div>
      </div>
    );
  }

  if (coverLetter === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-semibold">Cover letter not found</h1>
        <Link href="/dashboard/applications" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to applications
          </Button>
        </Link>
      </div>
    );
  }

  const showPlaceholderState = coverLetter.activeVersion === 0;
  const showFailedBanner = coverLetter.generationState === "failed" || Boolean(failedQueueItem);
  const readOnlyDocument = isGenerationPending || !isViewingActiveVersion;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/applications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Cover Letter Editor</h1>
            <p className="text-sm text-foreground/60">
              {coverLetter.application?.company ? `${coverLetter.application.company}` : "Application"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleVisibility}
            disabled={isUpdatingVisibility || isGenerationPending || showPlaceholderState}
          >
            {coverLetter.visibility === "public" ? (
              <>
                <EyeSlash className="mr-2 h-4 w-4" />
                Make Private
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Make Public
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={coverLetter.visibility !== "public" || isGenerationPending || showPlaceholderState}
          >
            <LinkSimple className="mr-2 h-4 w-4" />
            Copy Public URL
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isQueueingRegeneration || isGenerationPending || showPlaceholderState}
          >
            <Sparkle className="mr-2 h-4 w-4" />
            {isQueueingRegeneration ? "Queueing..." : "Regenerate"}
          </Button>
          {(showPlaceholderState || showFailedBanner) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteDraft}
              disabled={isDeletingDraft || isGenerationPending}
            >
              <Trash className="mr-2 h-4 w-4" />
              {isDeletingDraft ? "Deleting..." : "Delete Draft"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving || isGenerationPending || !isViewingActiveVersion}
          >
            <FloppyDisk className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.variant}>
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>{notice.description}</AlertDescription>
        </Alert>
      )}

      {showFailedBanner && (
        <Alert variant="error">
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription>
            {coverLetter.generationError ??
              failedQueueItem?.error?.message ??
              "The queued generation failed. Retry when you're ready."}
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            {!showPlaceholderState && (
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={isQueueingRegeneration}>
                Retry
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismissFailure}
              disabled={isDismissingFailure}
            >
              {isDismissingFailure ? "Dismissing..." : "Dismiss"}
            </Button>
          </div>
        </Alert>
      )}

      {profileContext && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Context</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/70">
            <div>
              <span className="font-medium text-foreground">Primary role: </span>
              {profileContext.derived.primaryTargetRole || "Not set"}
            </div>
            <div className="mt-1">
              <span className="font-medium text-foreground">Top skills: </span>
              {profileContext.derived.topSkills.slice(0, 5).join(", ") || "Not set"}
            </div>
            {profileContext.derived.targetSummary && (
              <div className="mt-2 rounded-md border bg-secondary/20 px-3 py-2 text-sm">
                {profileContext.derived.targetSummary}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document</CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {isGenerationPending && (
            <AiLoadingState
              title={activeStagePreset.title}
              description={activeStagePreset.description}
              stages={activeStagePreset.stages}
              activeStage={activeStageIndex}
              blocking={showPlaceholderState}
              compact={!showPlaceholderState}
            />
          )}

          {!showPlaceholderState && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="cover-letter-title">Title</Label>
                  <Input
                    id="cover-letter-title"
                    value={title}
                    disabled={!isViewingActiveVersion || isGenerationPending}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cover-letter-version">Version</Label>
                  <Select
                    value={selectedVersion?.toString()}
                    onValueChange={(value) => setSelectedVersion(Number(value))}
                    disabled={isGenerationPending}
                  >
                    <SelectTrigger id="cover-letter-version">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {normalizedVersions.map((version) => {
                        const versionNumber = version.version ?? 0;
                        return (
                          <SelectItem key={version._id} value={versionNumber.toString()}>
                            Version {versionNumber}
                            {versionNumber === coverLetter.activeVersion ? " (Active)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isViewingActiveVersion && (
                <div className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning">
                  You are viewing a previous version. Switch to the active version to edit or regenerate.
                </div>
              )}

              {readOnlyDocument ? (
                <div
                  className="prose max-w-none rounded-md border p-4"
                  dangerouslySetInnerHTML={{ __html: selectedVersionData?.contentHtml ?? editorHtml }}
                />
              ) : (
                <RichInput
                  key={`active-${selectedVersion}`}
                  content={editorHtml}
                  editorClassName="min-h-[500px] max-h-none"
                  onChange={setEditorHtml}
                />
              )}

              <div className="grid gap-2 rounded-md border bg-secondary/20 p-3 text-sm">
                <div>
                  <span className="font-medium">Preset: </span>
                  {COVER_LETTER_PRESET_LABELS[coverLetter.preset]}
                </div>
                <div>
                  <span className="font-medium">Focus modules: </span>
                  {coverLetter.focusModules
                    .map((module) => COVER_LETTER_MODULE_LABELS[module])
                    .join(", ")}
                </div>
                {coverLetter.customInstruction && (
                  <div>
                    <span className="font-medium">Custom direction: </span>
                    {coverLetter.customInstruction}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
