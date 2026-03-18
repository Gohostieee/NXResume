"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function PublicCoverLetterPage() {
  const params = useParams<{ username: string; slug: string }>();
  const coverLetter = useQuery(api.coverLetters.getPublicByUsernameSlug, {
    username: params.username,
    slug: params.slug,
  });

  if (coverLetter === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  if (coverLetter === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Cover Letter Not Found</h1>
        <p className="mt-2 text-foreground/60">
          This cover letter doesn&apos;t exist or is not public.
        </p>
        <Link href="/" className="mt-4">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-background">
        <div className="container flex min-h-16 items-center justify-between py-3">
          <div>
            <h1 className="font-semibold">{coverLetter.title}</h1>
            <p className="text-xs text-foreground/60">
              by {coverLetter.user?.name || params.username}
            </p>
          </div>
          <div className="text-sm text-foreground/60">
            {coverLetter.application?.company ?? "Company"}
          </div>
        </div>
      </header>

      <main className="container py-8">
        <article className="prose prose-zinc mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-lg dark:prose-invert">
          <div dangerouslySetInnerHTML={{ __html: coverLetter.activeVersionData.contentHtml }} />
        </article>
      </main>

      <footer className="border-t bg-background py-4">
        <div className="container text-center text-sm text-foreground/60">
          Built with{" "}
          <Link href="/" className="text-primary hover:underline">
            NXResume
          </Link>
        </div>
      </footer>
    </div>
  );
}
