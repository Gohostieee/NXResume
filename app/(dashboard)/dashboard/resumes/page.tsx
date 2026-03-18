"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { importResumeFromJsonFile } from "@/lib/resume/import";
import { useOpenAiStore } from "@/stores/openai";
import {
  Plus,
  DotsThreeVertical,
  Copy,
  Trash,
  Lock,
  LockOpen,
  Eye,
  EyeSlash,
  FileText,
  FileJs,
  FilePdf,
  Sparkle,
  SpinnerGap,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateMode = "blank" | "profile" | "json" | "pdf";

const createModeMeta: Record<
  CreateMode,
  { label: string; description: string }
> = {
  blank: {
    label: "Blank",
    description: "Start from an empty resume.",
  },
  profile: {
    label: "Profile",
    description: "Seed a resume from your saved profile context.",
  },
  json: {
    label: "JSON",
    description: "Import an exported resume JSON file.",
  },
  pdf: {
    label: "PDF",
    description: "Use AI to convert a resume PDF into NXResume data.",
  },
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};

export default function ResumesPage() {
  const router = useRouter();
  const resumes = useQuery(api.resumes.list);
  const profileContext = useQuery(api.careerProfiles.getContext);
  const createResume = useMutation(api.resumes.create);
  const createResumeFromProfile = useMutation(api.resumes.createFromProfile);
  const createPendingPdfImport = useMutation(api.resumes.createPendingPdfImport);
  const deleteResume = useMutation(api.resumes.remove);
  const duplicateResume = useMutation(api.resumes.duplicate);
  const lockResume = useMutation(api.resumes.lock);
  const updateResume = useMutation(api.resumes.update);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const enqueueAiAction = useMutation(api.aiQueue.enqueue);
  const { model } = useOpenAiStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newResumeTitle, setNewResumeTitle] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>("blank");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const resetCreateDialog = () => {
    setNewResumeTitle("");
    setCreateMode("blank");
    setSelectedFile(null);
    setCreateError(null);
    setFileInputKey((current) => current + 1);
  };

  const handleCreateDialogChange = (open: boolean) => {
    if (!open && !isCreating) {
      resetCreateDialog();
    }

    setIsCreateDialogOpen(open);
  };

  const handleCreateResume = async () => {
    const trimmedTitle = newResumeTitle.trim();

    if (!trimmedTitle) {
      setCreateError("Resume title is required.");
      return;
    }

    if (createMode !== "blank" && createMode !== "profile" && !selectedFile) {
      setCreateError(
        createMode === "json"
          ? "Choose a JSON file to import."
          : "Choose a PDF file to import.",
      );
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      let importedData = undefined;

      if (createMode === "profile") {
        const resumeId = await createResumeFromProfile({
          title: trimmedTitle,
        });

        setIsCreateDialogOpen(false);
        resetCreateDialog();
        router.push(`/builder/${resumeId}`);
        return;
      }

      if (createMode === "json" && selectedFile) {
        importedData = await importResumeFromJsonFile(selectedFile);
      }

      if (createMode === "pdf" && selectedFile) {
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type || "application/pdf" },
          body: selectedFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload PDF");
        }

        const { storageId } = (await uploadResponse.json()) as { storageId: string };
        const resumeId = await createPendingPdfImport({
          title: trimmedTitle,
          filename: selectedFile.name,
          storageId: storageId as Id<"_storage">,
        });

        try {
          await enqueueAiAction({
            request: {
              kind: "resume.import_pdf",
              resumeId,
              model: model ?? undefined,
            },
          });
        } catch (error) {
          await deleteResume({ id: resumeId as any }).catch(() => null);
          throw error;
        }

        setIsCreateDialogOpen(false);
        resetCreateDialog();
        return;
      }

      const resumeId = await createResume({
        title: trimmedTitle,
        historySource:
          createMode === "pdf" ? "import_pdf" : createMode === "json" ? "import_json" : "create",
        ...(importedData ? { data: importedData } : {}),
      });

      setIsCreateDialogOpen(false);
      resetCreateDialog();

      if (createMode === "json") {
        router.push(`/builder/${resumeId}`);
      }
    } catch (error) {
      setCreateError(getErrorMessage(error));
      console.error("Failed to create resume:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    try {
      await deleteResume({ id: id as any });
    } catch (error) {
      console.error("Failed to delete resume:", error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateResume({ id: id as any });
    } catch (error) {
      console.error("Failed to duplicate resume:", error);
    }
  };

  const handleToggleLock = async (id: string, currentLocked: boolean) => {
    try {
      await lockResume({ id: id as any, locked: !currentLocked });
    } catch (error) {
      console.error("Failed to toggle lock:", error);
    }
  };

  const handleToggleVisibility = async (id: string, currentVisibility: string) => {
    try {
      await updateResume({
        id: id as any,
        visibility: currentVisibility === "public" ? "private" : "public",
      });
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    }
  };

  const handleRetryPdfImport = async (resumeId: string) => {
    try {
      await enqueueAiAction({
        request: {
          kind: "resume.import_pdf",
          resumeId: resumeId as any,
          model: model ?? undefined,
        },
      });
    } catch (error) {
      console.error("Failed to retry PDF import:", error);
    }
  };

  if (resumes === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resumes</h1>
          <p className="text-foreground/60">
            Create, import, edit, and manage your resumes.
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Resume
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Resume</DialogTitle>
              <DialogDescription>
                Start blank or import from JSON or PDF.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="My Resume"
                  value={newResumeTitle}
                  onChange={(e) => {
                    setNewResumeTitle(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateResume();
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label>Import Mode</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["blank", "profile", "json", "pdf"] as CreateMode[]).map((mode) => {
                    const isActive = createMode === mode;
                    const icon =
                      mode === "blank" ? (
                        <FileText className="h-4 w-4" />
                      ) : mode === "profile" ? (
                        <Sparkle className="h-4 w-4" />
                      ) : mode === "json" ? (
                        <FileJs className="h-4 w-4" />
                      ) : (
                        <FilePdf className="h-4 w-4" />
                      );

                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                        onClick={() => {
                          setCreateMode(mode);
                          setSelectedFile(null);
                          setCreateError(null);
                          setFileInputKey((current) => current + 1);
                        }}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          {icon}
                          {createModeMeta[mode].label}
                        </div>
                        <p className="mt-1 text-xs text-foreground/60">
                          {createModeMeta[mode].description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {createMode === "profile" && (
                <div className="rounded-lg border bg-secondary/20 p-3 text-sm text-foreground/70">
                  <div className="font-medium text-foreground">Using profile context</div>
                  <div className="mt-1">
                    {profileContext
                      ? profileContext.derived.targetSummary ||
                        "Your saved profile will seed contact details, summary, experience, and skills."
                      : "Your saved profile will seed contact details, summary, experience, and skills."}
                  </div>
                </div>
              )}

              {createMode !== "blank" && createMode !== "profile" && (
                <div className="grid gap-2">
                  <Label htmlFor="resume-file">
                    {createMode === "json" ? "JSON File" : "PDF File"}
                  </Label>
                  <Input
                    key={fileInputKey}
                    id="resume-file"
                    type="file"
                    accept={createMode === "json" ? ".json,application/json" : ".pdf,application/pdf"}
                    onChange={(e) => {
                      setSelectedFile(e.target.files?.[0] ?? null);
                      setCreateError(null);
                    }}
                  />
                  <p className="text-xs text-foreground/60">
                    {createMode === "json"
                      ? "Supports NXResume exports, Reactive Resume JSON, and JSON Resume."
                      : "Uses your OpenAI key from Settings or the server environment to extract resume data."}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-foreground/60">
                      Selected file: {selectedFile.name}
                    </p>
                  )}
                </div>
              )}

              {createError && (
                <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
                  {createError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleCreateDialogChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
                <Button onClick={handleCreateResume} disabled={isCreating}>
                {isCreating
                  ? createMode === "pdf"
                    ? "Analyzing PDF..."
                    : createMode === "json"
                      ? "Importing JSON..."
                      : createMode === "profile"
                        ? "Building From Profile..."
                      : "Creating..."
                  : createMode === "blank"
                    ? "Create"
                    : createMode === "profile"
                      ? "Create From Profile"
                    : "Create From Import"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No resumes yet</h3>
            <p className="text-foreground/60">
              Create or import your first resume to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card key={resume._id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{resume.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Last updated:{" "}
                      {new Date(resume.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {resume.importState === "failed" ? (
                          <>
                            <DropdownMenuItem onClick={() => handleRetryPdfImport(resume._id)}>
                              <FilePdf className="mr-2 h-4 w-4" />
                              Retry PDF Import
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(resume._id)}
                              disabled={resume.importState === "pending"}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleLock(resume._id, resume.locked)}
                              disabled={resume.importState === "pending"}
                            >
                              {resume.locked ? (
                                <>
                                  <LockOpen className="mr-2 h-4 w-4" />
                                  Unlock
                                </>
                              ) : (
                                <>
                                  <Lock className="mr-2 h-4 w-4" />
                                  Lock
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleVisibility(resume._id, resume.visibility)}
                              disabled={resume.importState === "pending"}
                            >
                              {resume.visibility === "public" ? (
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
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-error"
                          onClick={() => handleDelete(resume._id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {resume.locked && (
                    <span className="flex items-center gap-1 text-xs text-foreground/60">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      resume.visibility === "public"
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {resume.visibility === "public" ? "Public" : "Private"}
                  </span>
                </div>
                <Link href={`/builder/${resume._id}`}>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    disabled={resume.importState === "pending" || resume.importState === "failed"}
                  >
                    {resume.importState === "pending"
                      ? "Importing PDF..."
                      : resume.importState === "failed"
                        ? "Import failed"
                        : "Edit Resume"}
                  </Button>
                </Link>
                {resume.importState === "pending" && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-sky-700">
                    <SpinnerGap className="h-3 w-3 animate-spin" />
                    PDF import is running in the background.
                  </div>
                )}
                {resume.importState === "failed" && (
                  <div className="mt-3 text-xs text-error">
                    {resume.importError || "PDF import failed. Retry or delete this placeholder resume."}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
