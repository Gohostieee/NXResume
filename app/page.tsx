"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const primaryHref = isSignedIn ? "/dashboard/resumes" : "/sign-up";
  const primaryLabel = isSignedIn ? "Open dashboard" : "Open the builder";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border-2 bg-primary text-base font-semibold text-primary-foreground">
              NX
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                NXResume
              </p>
              <p className="text-xs text-muted-foreground">
                RX Resume, adapted for Next.js
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a className="transition hover:text-foreground" href="#features">
              Stuff it does
            </a>
            <a className="transition hover:text-foreground" href="#migration">
              Why we moved
            </a>
            <a className="transition hover:text-foreground" href="#open-source">
              OSS bits
            </a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {!isSignedIn ? (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Open the builder
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard/resumes"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Open dashboard
              </Link>
            )}
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-md border bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm bg-foreground" />
              OSS build // Next.js
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                NXResume is a resume builder you can run on your own box.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
                Built on RX Resume's foundation, adapted for Next.js. Same core idea:
                create clean resumes, export them, and share them. Just using the
                stack we prefer to work with.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={primaryHref}
                className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {primaryLabel}
              </Link>
              {!isSignedIn ? (
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Sign in
                </Link>
              ) : (
                <a
                  href="#features"
                  className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Scroll for details
                </a>
              )}
              <a
                href="https://rxresu.me/"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Original RX Resume
              </a>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-foreground" />
                Self-hostable, no sales pitch
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-foreground" />
                Live preview + PDF export
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-foreground" />
                Made for contributors
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-md border bg-card p-6">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                <span>Resume preview</span>
                <span className="rounded-sm border bg-muted px-3 py-1 text-[10px]">
                  Draft
                </span>
              </div>
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <div className="h-3 w-3/4 rounded-full bg-foreground" />
                  <div className="h-2 w-1/2 rounded-full bg-muted-foreground" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-md border bg-muted p-4">
                    <div className="h-2 w-12 rounded-full bg-foreground" />
                    <div className="h-2 w-full rounded-full bg-muted-foreground" />
                    <div className="h-2 w-4/5 rounded-full bg-muted-foreground/60" />
                  </div>
                  <div className="space-y-2 rounded-md border bg-muted p-4">
                    <div className="h-2 w-16 rounded-full bg-foreground" />
                    <div className="h-2 w-full rounded-full bg-muted-foreground" />
                    <div className="h-2 w-3/4 rounded-full bg-muted-foreground/60" />
                  </div>
                </div>
                <div className="space-y-2 rounded-md border bg-muted p-4">
                  <div className="h-2 w-24 rounded-full bg-foreground" />
                  <div className="h-2 w-full rounded-full bg-muted-foreground" />
                  <div className="h-2 w-2/3 rounded-full bg-muted-foreground/60" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -left-8 hidden w-44 rounded-md border bg-background p-4 text-xs text-muted-foreground shadow-lg md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em]">
                Templates
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">12+</p>
              <p className="mt-1 text-xs">
                Clean layouts, quick swaps
              </p>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto w-full max-w-6xl px-6 py-20"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Stuff it does
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                The basics, done right.
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              No SaaS dashboards or upsells. Just a resume builder you can run,
              tweak, and share.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Live preview
              </p>
              <h3 className="mt-4 text-xl font-semibold">
                Edit and see it update.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Type on the left, preview on the right, export when it looks
                right.
              </p>
            </div>
            <div className="rounded-md border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Templates
              </p>
              <h3 className="mt-4 text-xl font-semibold">
                Swap styles without fuss.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Clean layouts that keep content readable and ATS-friendly.
              </p>
            </div>
            <div className="rounded-md border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Self-host
              </p>
              <h3 className="mt-4 text-xl font-semibold">
                Run it where you want.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Single Next.js app, fewer things to wire up, easier deploys.
              </p>
            </div>
            <div className="rounded-md border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                PDF export
              </p>
              <h3 className="mt-4 text-xl font-semibold">
                Print-ready when you are.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Export clean PDFs without wrestling with weird margins.
              </p>
            </div>
            <div className="rounded-md border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Public share links
              </p>
              <h3 className="mt-4 text-xl font-semibold">
                Share a link, done.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Post a public version without giving up ownership of your data.
              </p>
            </div>
            <div className="rounded-md border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Contributor friendly
              </p>
              <h3 className="mt-4 text-xl font-semibold">
                Hackable and easy to ship.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Fewer services, fewer hoops, easier PRs.
              </p>
            </div>
          </div>
        </section>

        <section
          id="migration"
          className="mx-auto w-full max-w-6xl px-6 py-20"
        >
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Why this version
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                RX Resume is great. We just prefer Next.js.
              </h2>
              <p className="text-base text-muted-foreground">
                Built on the same foundation, adapted to our preferred stack.
                Next.js fits our workflow and makes deployment straightforward.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <a
                  href="https://rxresu.me/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline underline-offset-4 hover:text-foreground"
                >
                  Check out RX Resume
                </a>
                <span>/</span>
                <span>Both are great options</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-md border bg-card p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Original
                </p>
                <h3 className="mt-4 text-xl font-semibold">
                  Full-featured platform
                </h3>
                <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-muted-foreground">
                  <li>Comprehensive feature set</li>
                  <li>Robust architecture</li>
                  <li>Active community</li>
                </ul>
              </div>
              <div className="rounded-md border bg-primary p-6 text-primary-foreground">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-70">
                  Our version
                </p>
                <h3 className="mt-4 text-xl font-semibold">
                  Next.js focused
                </h3>
                <ul className="mt-4 list-disc space-y-3 pl-5 text-sm opacity-90">
                  <li>Familiar Next.js patterns</li>
                  <li>Simplified deployment</li>
                  <li>Easy to customize</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          id="open-source"
          className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10"
        >
          <div className="rounded-md border bg-card p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Open source
                </p>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  If you want to tinker, fork it.
                </h2>
                <p className="text-base text-muted-foreground">
                  This is OSS software. Run it yourself, mess with the templates
                  or add features, and send a PR if you feel like it.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={primaryHref}
                  className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {primaryLabel}
                </Link>
                <a
                  href="#features"
                  className="rounded-md border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
                >
                  Quick feature list
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 border-t px-6 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Open-source resume builder, no SaaS energy.</p>
          <div className="flex items-center gap-4">
            <p>RX Resume inspired, Next.js rebuilt.</p>
            <span>•</span>
            <a
              href="https://webv1.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition hover:text-foreground"
            >
              webv1.com
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
