"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DownloadSimple, ArrowLeft } from "@phosphor-icons/react";

export default function PublicResumePage() {
  const params = useParams<{ username: string; slug: string }>();
  const resume = useQuery(api.resumes.getPublicByUsernameSlug, {
    username: params.username,
    slug: params.slug,
  });
  const incrementViews = useMutation(api.statistics.incrementViews);

  // Increment view count on mount
  useEffect(() => {
    if (resume?._id) {
      incrementViews({ resumeId: resume._id });
    }
  }, [resume?._id, incrementViews]);

  if (resume === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  if (resume === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Resume Not Found</h1>
        <p className="mt-2 text-foreground/60">
          This resume doesn&apos;t exist or is not public.
        </p>
        <Link href="/">
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <div>
            <h1 className="font-semibold">{resume.title}</h1>
            <p className="text-xs text-foreground/60">
              by {resume.user?.name || params.username}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <DownloadSimple className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Resume Preview */}
      <main className="container py-8">
        <div className="mx-auto aspect-[1/1.414] max-w-3xl rounded-lg bg-white shadow-lg">
          <div className="flex h-full items-center justify-center text-foreground/30">
            Public Resume Preview
            <br />
            {resume.data?.basics?.name && (
              <span className="block text-lg font-semibold text-foreground">
                {resume.data.basics.name}
              </span>
            )}
            <br />
            Template: {resume.data?.metadata?.template || "rhyhorn"}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-4">
        <div className="container text-center text-sm text-foreground/60">
          Built with{" "}
          <Link href="/" className="text-primary hover:underline">
            Soul Resume
          </Link>
        </div>
      </footer>
    </div>
  );
}
