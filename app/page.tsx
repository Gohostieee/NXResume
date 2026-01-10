"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const primaryHref = isSignedIn ? "/dashboard/resumes" : "/sign-up";
  const primaryLabel = isSignedIn ? "Open dashboard" : "Open the builder";
  const cardClass =
    "rounded-md border-2 border-[#1a1711]/20 bg-[#fff6df] p-6 shadow-[4px_4px_0_#1a1711]";
  const panelClass =
    "rounded-md border-2 border-[#1a1711] bg-[#1a1711] p-6 text-[#f7f0e5] shadow-[4px_4px_0_#f4c14f]";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f0e5] text-[#1a1711]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(26,23,17,0.12)_1px,transparent_1px)] bg-[size:100%_6px] opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,193,79,0.45),transparent_55%)]" />
      </div>

      <div className="relative">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b-2 border-[#1a1711]/10 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#1a1711] bg-[#f4c14f] text-base font-semibold text-[#1a1711] shadow-[3px_3px_0_#1a1711]">
              NX
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/70">
                NXResume
              </p>
              <p className="text-xs text-[#1a1711]/60">
                RX Resume, but cleaned up and on Next.js
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#1a1711]/70 md:flex">
            <a className="transition hover:text-[#1a1711]" href="#features">
              Stuff it does
            </a>
            <a className="transition hover:text-[#1a1711]" href="#migration">
              Why we moved
            </a>
            <a className="transition hover:text-[#1a1711]" href="#open-source">
              OSS bits
            </a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {!isSignedIn ? (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-[#1a1711]/70 transition hover:text-[#1a1711]"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md border-2 border-[#1a1711] bg-[#1a1711] px-4 py-2 text-sm font-semibold text-[#f7f0e5] shadow-[3px_3px_0_#f4c14f] transition hover:-translate-y-0.5"
                >
                  Open the builder
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard/resumes"
                className="rounded-md border-2 border-[#1a1711] bg-[#1a1711] px-4 py-2 text-sm font-semibold text-[#f7f0e5] shadow-[3px_3px_0_#f4c14f] transition hover:-translate-y-0.5"
              >
                Open dashboard
              </Link>
            )}
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-md border-2 border-[#1a1711]/20 bg-[#fff6df] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#1a1711]/70 shadow-[3px_3px_0_#1a1711] animate-rise">
              <span className="h-2 w-2 rounded-sm bg-[#1a1711]" />
              OSS build // Next.js
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#1a1711] sm:text-5xl lg:text-6xl animate-rise">
                NXResume is a resume builder you can run on your own box.
              </h1>
              <p className="max-w-xl text-lg text-[#1a1711]/70 sm:text-xl animate-rise [animation-delay:120ms] bg-background card-muted-foreground">
                We took RX Resume and moved it to Next.js. Fewer moving parts,
                easier to host, and nicer to hack on. Same idea: make a clean
                resume, export it, and share it.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 animate-rise [animation-delay:240ms]">
              <Link
                href={primaryHref}
                className="rounded-md border-2 border-[#1a1711] bg-[#1a1711] px-5 py-3 text-sm font-semibold text-[#f7f0e5] shadow-[3px_3px_0_#f4c14f] transition hover:-translate-y-0.5"
              >
                {primaryLabel}
              </Link>
              {!isSignedIn ? (
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-[#1a1711]/70 transition hover:text-[#1a1711]"
                >
                  Sign in
                </Link>
              ) : (
                <a
                  href="#features"
                  className="text-sm font-semibold text-[#1a1711]/70 transition hover:text-[#1a1711]"
                >
                  Scroll for details
                </a>
              )}
              <a
                href="https://rxresu.me/"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[#1a1711]/70 transition hover:text-[#1a1711]"
              >
                Original RX Resume
              </a>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-[#1a1711]/70 animate-rise [animation-delay:360ms]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-[#1a1711]" />
                Self-hostable, no sales pitch
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-[#1a1711]" />
                Live preview + PDF export
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-[#1a1711]" />
                Made for contributors
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className={cardClass}>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                <span>Resume preview</span>
                <span className="rounded-sm border border-[#1a1711] bg-[#f4c14f] px-3 py-1 text-[10px] text-[#1a1711]">
                  Draft
                </span>
              </div>
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <div className="h-3 w-3/4 rounded-full bg-[#1a1711]" />
                  <div className="h-2 w-1/2 rounded-full bg-[#1a1711]/40" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-md border-2 border-[#1a1711]/20 bg-[#f7f0e5] p-4">
                    <div className="h-2 w-12 rounded-full bg-[#1a1711]/60" />
                    <div className="h-2 w-full rounded-full bg-[#1a1711]/30" />
                    <div className="h-2 w-4/5 rounded-full bg-[#1a1711]/20" />
                  </div>
                  <div className="space-y-2 rounded-md border-2 border-[#1a1711]/20 bg-[#f7f0e5] p-4">
                    <div className="h-2 w-16 rounded-full bg-[#1a1711]/60" />
                    <div className="h-2 w-full rounded-full bg-[#1a1711]/30" />
                    <div className="h-2 w-3/4 rounded-full bg-[#1a1711]/20" />
                  </div>
                </div>
                <div className="space-y-2 rounded-md border-2 border-[#1a1711]/20 bg-[#f7f0e5] p-4">
                  <div className="h-2 w-24 rounded-full bg-[#1a1711]/60" />
                  <div className="h-2 w-full rounded-full bg-[#1a1711]/30" />
                  <div className="h-2 w-2/3 rounded-full bg-[#1a1711]/20" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -left-8 hidden w-44 rounded-md border-2 border-[#1a1711]/20 bg-[#fff6df] p-4 text-xs text-[#1a1711]/70 shadow-[4px_4px_0_#1a1711] md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1a1711]/60">
                Templates
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#1a1711]">12+</p>
              <p className="mt-1 text-xs text-[#1a1711]/60">
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                Stuff it does
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1a1711] sm:text-4xl">
                The basics, done right.
              </h2>
            </div>
            <p className="max-w-md text-sm text-[#1a1711]/70">
              No SaaS dashboards or upsells. Just a resume builder you can run,
              tweak, and share.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                Live preview
              </p>
              <h3 className="mt-4 text-xl font-semibold text-[#1a1711]">
                Edit and see it update.
              </h3>
              <p className="mt-3 text-sm text-[#1a1711]/70">
                Type on the left, preview on the right, export when it looks
                right.
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                Templates
              </p>
              <h3 className="mt-4 text-xl font-semibold text-[#1a1711]">
                Swap styles without fuss.
              </h3>
              <p className="mt-3 text-sm text-[#1a1711]/70">
                Clean layouts that keep content readable and ATS-friendly.
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                Self-host
              </p>
              <h3 className="mt-4 text-xl font-semibold text-[#1a1711]">
                Run it where you want.
              </h3>
              <p className="mt-3 text-sm text-[#1a1711]/70">
                Single Next.js app, fewer things to wire up, easier deploys.
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                PDF export
              </p>
              <h3 className="mt-4 text-xl font-semibold text-[#1a1711]">
                Print-ready when you are.
              </h3>
              <p className="mt-3 text-sm text-[#1a1711]/70">
                Export clean PDFs without wrestling with weird margins.
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                Public share links
              </p>
              <h3 className="mt-4 text-xl font-semibold text-[#1a1711]">
                Share a link, done.
              </h3>
              <p className="mt-3 text-sm text-[#1a1711]/70">
                Post a public version without giving up ownership of your data.
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                Contributor friendly
              </p>
              <h3 className="mt-4 text-xl font-semibold text-[#1a1711]">
                Hackable and easy to ship.
              </h3>
              <p className="mt-3 text-sm text-[#1a1711]/70">
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                Why we moved
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-[#1a1711] sm:text-4xl">
                We liked RX Resume, we just wanted a simpler stack.
              </h2>
              <p className="text-base text-[#1a1711]/70">
                Same spirit, less overhead. The Next.js version is easier to
                spin up, easier to host, and easier to contribute to.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#1a1711]/70">
                <a
                  href="https://rxresu.me/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#1a1711] underline underline-offset-4"
                >
                  Explore RX Resume
                </a>
                <span className="text-[#1a1711]/40">/</span>
                <span>Still OSS, just easier to run.</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className={cardClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                  Before (old stack)
                </p>
                <h3 className="mt-4 text-xl font-semibold text-[#1a1711]">
                  More parts, more setup.
                </h3>
                <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-[#1a1711]/70">
                  <li>Extra services to wire up.</li>
                  <li>Heavier local setup for contributors.</li>
                  <li>More friction for small changes.</li>
                </ul>
              </div>
              <div className={panelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7f0e5]/70">
                  After (this one)
                </p>
                <h3 className="mt-4 text-xl font-semibold text-[#f7f0e5]">
                  One Next.js app, way less mess.
                </h3>
                <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-[#f7f0e5]/80">
                  <li>Faster setup and easier hosting.</li>
                  <li>Cleaner structure for templates.</li>
                  <li>Less friction for contributors.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          id="open-source"
          className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10"
        >
          <div className={`${cardClass} p-10`}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a1711]/60">
                  Open source
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-[#1a1711] sm:text-4xl">
                  If you want to tinker, fork it.
                </h2>
                <p className="text-base text-[#1a1711]/70">
                  This is OSS software. Run it yourself, mess with the templates
                  or add features, and send a PR if you feel like it.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={primaryHref}
                  className="rounded-md border-2 border-[#1a1711] bg-[#1a1711] px-6 py-3 text-sm font-semibold text-[#f7f0e5] shadow-[3px_3px_0_#f4c14f] transition hover:-translate-y-0.5"
                >
                  {primaryLabel}
                </Link>
                <a
                  href="#features"
                  className="rounded-md border-2 border-[#1a1711] px-6 py-3 text-sm font-semibold text-[#1a1711] shadow-[3px_3px_0_#1a1711] transition hover:-translate-y-0.5"
                >
                  Quick feature list
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-6 pb-10 text-xs text-[#1a1711]/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Open-source resume builder, no SaaS energy.</p>
          <p>RX Resume inspired, Next.js rebuilt.</p>
        </footer>
      </div>
    </main>
  );
}
