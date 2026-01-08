"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function HomePage() {
  const { isSignedIn } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Soul Resume
        </h1>
        <p className="mt-6 text-lg leading-8 text-foreground/80">
          A free and open-source resume builder that simplifies the process of
          creating, updating, and sharing your resume.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          {!isSignedIn ? (
            <>
              <Link
                href="/sign-up"
                className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-accent"
              >
                Get Started
              </Link>
              <Link
                href="/sign-in"
                className="text-sm font-semibold leading-6 text-foreground"
              >
                Sign In <span aria-hidden="true">&rarr;</span>
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard/resumes"
              className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-accent"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
