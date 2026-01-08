"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, DotsThreeVertical, Copy, Trash, Lock, LockOpen, Eye, EyeSlash, FileText } from "@phosphor-icons/react";
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

export default function ResumesPage() {
  const resumes = useQuery(api.resumes.list);
  const createResume = useMutation(api.resumes.create);
  const deleteResume = useMutation(api.resumes.remove);
  const duplicateResume = useMutation(api.resumes.duplicate);
  const lockResume = useMutation(api.resumes.lock);
  const updateResume = useMutation(api.resumes.update);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newResumeTitle, setNewResumeTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateResume = async () => {
    if (!newResumeTitle.trim()) return;

    setIsCreating(true);
    try {
      await createResume({ title: newResumeTitle.trim() });
      setNewResumeTitle("");
      setIsCreateDialogOpen(false);
    } catch (error) {
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
            Create, edit, and manage your resumes.
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                Give your new resume a title to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="My Resume"
                  value={newResumeTitle}
                  onChange={(e) => setNewResumeTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateResume();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateResume} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
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
              Create your first resume to get started.
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
                      <DropdownMenuItem onClick={() => handleDuplicate(resume._id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleLock(resume._id, resume.locked)}
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
                        onClick={() =>
                          handleToggleVisibility(resume._id, resume.visibility)
                        }
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
                  <Button className="mt-4 w-full" variant="outline">
                    Edit Resume
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
