"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BuilderLayout } from "@/components/builder/builder-layout";
import { useEffect, useRef, useState } from "react";
import { useResumeStore } from "@/stores/resume";

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [hasWaitedForAuth, setHasWaitedForAuth] = useState(false);

  // Only query when auth is loaded
  const resume = useQuery(
    api.resumes.getById,
    isAuthLoaded && isSignedIn ? { id: params.id as Id<"resumes"> } : "skip"
  );
  const setResume = useResumeStore((state) => state.setResume);
  const hasResumeInStore = useResumeStore((state) => Boolean(state.resume?.data));
  const lastResumeIdRef = useRef<string | null>(null);

  // Give auth a moment to load before showing "not found"
  useEffect(() => {
    if (isAuthLoaded) {
      // Small delay to ensure token is propagated to Convex
      const timer = setTimeout(() => setHasWaitedForAuth(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoaded]);

  // Sync resume to store when loaded
  useEffect(() => {
    if (resume) {
      setResume(resume as any);
      const resumeId = (resume as { id?: string; _id?: string }).id ?? (resume as { _id?: string })._id ?? null;
      if (resumeId && lastResumeIdRef.current !== resumeId) {
        useResumeStore.temporal.getState().clear();
        lastResumeIdRef.current = resumeId;
      }
    }
  }, [resume, setResume]);

  // Show loading while auth is loading
  if (!isAuthLoaded || !hasWaitedForAuth) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  // If not signed in, redirect would have happened via middleware
  // but show message just in case
  if (!isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-foreground/60">Please sign in to continue...</div>
      </div>
    );
  }

  // Query is loading
  if (resume === undefined && !hasResumeInStore) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-foreground/60">Loading resume...</div>
      </div>
    );
  }

  // Resume not found or no access
  if (resume === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Resume Not Found</h1>
        <p className="mt-2 text-foreground/60">
          The resume you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
    );
  }

  return <BuilderLayout resume={resume} />;
}
