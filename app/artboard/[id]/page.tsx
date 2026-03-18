"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { useArtboardStore } from "@/components/artboard/store/artboard";
import { Page } from "@/components/artboard/components/page";
import { getTemplate } from "@/components/templates";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { pageSizeMap } from "@/lib/utils";
import type { Template } from "@/lib/utils";
import type { ResumeData, SectionKey } from "@/lib/schema";
import { applyResumeDiffAnnotations, clearResumeDiffAnnotations } from "@/lib/resume/diff-annotations";
import { createResumeDiffModel } from "@/lib/resume/proposal";
import {
  FontProvider,
  useFontContext,
} from "@/components/artboard/providers/font-provider";

const MM_TO_PX = 3.78;

function ArtboardContent({
  transformRef,
  wheelPanning,
}: {
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  wheelPanning: boolean;
}) {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";
  const resume = useArtboardStore((state) => state.resume);
  const diffMode = useArtboardStore((state) => state.diffMode);
  const baseResume = useArtboardStore((state) => state.baseResume);
  const proposalResume = useArtboardStore((state) => state.proposalResume);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasCenteredRef = useRef(false);
  const { fontFamily, isLoaded, fontFamilyCSS } = useFontContext();
  const diffModel = useMemo(
    () => createResumeDiffModel(baseResume, proposalResume),
    [baseResume, proposalResume],
  );

  useEffect(() => {
    if (!rootRef.current) return;

    if (!diffMode) {
      clearResumeDiffAnnotations(rootRef.current);
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      applyResumeDiffAnnotations(rootRef.current, diffModel);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [diffMode, diffModel]);

  // Center the view once when resume data is first ready.
  useEffect(() => {
    if (isPrint) return;

    if (transformRef.current && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      setTimeout(() => {
        transformRef.current?.centerView(0.8, 0);
      }, 100);
    }
  }, [isPrint, transformRef]);

  const templateName = (resume.metadata?.template || "harvard") as Template;
  const TemplateComponent = getTemplate(templateName);
  const layout = resume.metadata?.layout || [[[]]];
  const pageFormat = resume.metadata?.page?.format || "a4";
  const pageSize = pageSizeMap[pageFormat];

  // Theme colors
  const primaryColor = resume.metadata?.theme?.primary || "#dc2626";
  const backgroundColor = resume.metadata?.theme?.background || "#ffffff";
  const textColor = resume.metadata?.theme?.text || "#000000";

  // Typography
  const fontSize = resume.metadata?.typography?.font?.size || 14;
  const lineHeight = resume.metadata?.typography?.lineHeight || 1.5;
  const pageMargin = resume.metadata?.page?.margin || 18;

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: transparent;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0;
        }

        .artboard-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 0;
        }

        .page {
          background: ${backgroundColor};
          color: ${textColor};
          font-family: ${fontFamilyCSS};
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .p-custom {
          padding: ${pageMargin * MM_TO_PX}px;
        }

        .text-primary {
          color: ${primaryColor};
        }

        .bg-primary {
          background-color: ${primaryColor};
        }

        .border-primary {
          border-color: ${primaryColor};
        }

        .space-y-4 > * + * {
          margin-top: 1rem;
        }

        .space-y-2 > * + * {
          margin-top: 0.5rem;
        }

        .space-y-0\\.5 > * + * {
          margin-top: 0.125rem;
        }

        .space-x-4 > * + * {
          margin-left: 1rem;
        }

        .flex {
          display: flex;
        }

        .flex-wrap {
          flex-wrap: wrap;
        }

        .items-center {
          align-items: center;
        }

        .items-start {
          align-items: flex-start;
        }

        .justify-between {
          justify-content: space-between;
        }

        .gap-x-1 {
          column-gap: 0.25rem;
        }

        .gap-x-1\\.5 {
          column-gap: 0.375rem;
        }

        .gap-x-2 {
          column-gap: 0.5rem;
        }

        .gap-x-6 {
          column-gap: 1.5rem;
        }

        .gap-y-0\\.5 {
          row-gap: 0.125rem;
        }

        .gap-y-3 {
          row-gap: 0.75rem;
        }

        .grid {
          display: grid;
        }

        .text-left {
          text-align: left;
        }

        .text-right {
          text-align: right;
        }

        .text-sm {
          font-size: 0.875em;
        }

        .text-base {
          font-size: 1em;
        }

        .text-2xl {
          font-size: 1.5em;
        }

        .font-bold {
          font-weight: 700;
        }

        .border-r {
          border-right: 1px solid currentColor;
          opacity: 0.3;
        }

        .border-b {
          border-bottom: 1px solid currentColor;
          opacity: 0.3;
        }

        .pr-2 {
          padding-right: 0.5rem;
        }

        .pb-0\\.5 {
          padding-bottom: 0.125rem;
        }

        .mb-2 {
          margin-bottom: 0.5rem;
        }

        .last\\:border-r-0:last-child {
          border-right: none;
        }

        .last\\:pr-0:last-child {
          padding-right: 0;
        }

        .shrink-0 {
          flex-shrink: 0;
        }

        .break-all {
          word-break: break-all;
        }

        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
        }

        .max-w-fit {
          max-width: fit-content;
        }

        .size-2 {
          width: 0.5rem;
          height: 0.5rem;
        }

        .rounded-full {
          border-radius: 9999px;
        }

        .border {
          border: 1px solid;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        .wysiwyg {
          font-size: inherit;
          line-height: inherit;
          white-space: pre-wrap;
        }

        .wysiwyg p {
          margin-bottom: 0.5em;
        }

        .wysiwyg p:last-child {
          margin-bottom: 0;
        }

        .wysiwyg ul, .wysiwyg ol {
          padding-left: 1.5em;
          margin-bottom: 0.5em;
        }

        .wysiwyg ul {
          list-style-type: disc;
        }

        .wysiwyg ol {
          list-style-type: decimal;
        }

        .wysiwyg li {
          margin-bottom: 0.25em;
        }

        .wysiwyg li:last-child {
          margin-bottom: 0;
        }

        .wysiwyg a {
          color: ${primaryColor};
          text-decoration: underline;
        }

        .wysiwyg strong, .wysiwyg b {
          font-weight: 700;
        }

        .wysiwyg em, .wysiwyg i {
          font-style: italic;
        }

        .wysiwyg u {
          text-decoration: underline;
        }

        .wysiwyg s {
          text-decoration: line-through;
        }

        .wysiwyg mark {
          background-color: rgba(255, 255, 0, 0.3);
          padding: 0 0.1em;
        }

        .wysiwyg blockquote {
          border-left: 3px solid ${primaryColor};
          padding-left: 1em;
          margin: 0.5em 0;
          font-style: italic;
        }

        .wysiwyg code {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.1em 0.3em;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }

        .wysiwyg pre {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.5em;
          border-radius: 4px;
          overflow-x: auto;
          margin: 0.5em 0;
        }

        .wysiwyg pre code {
          background: none;
          padding: 0;
        }

        .wysiwyg h1, .wysiwyg h2, .wysiwyg h3, .wysiwyg h4, .wysiwyg h5, .wysiwyg h6 {
          font-weight: 700;
          margin-top: 0.5em;
          margin-bottom: 0.25em;
        }

        .wysiwyg h1:first-child, .wysiwyg h2:first-child, .wysiwyg h3:first-child {
          margin-top: 0;
        }

        /* Picture styles */
        .picture {
          width: 64px;
          height: 64px;
          border-radius: 4px;
          object-fit: cover;
        }

        .picture-hidden {
          display: none;
        }

        .resume-diff-inline {
          background: rgba(34, 197, 94, 0.14);
          color: #166534;
          border-radius: 0.18rem;
          padding: 0 0.12em;
        }

        .resume-diff-block {
          background: rgba(34, 197, 94, 0.09);
          color: #166534;
          border-radius: 0.5rem;
          box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.2);
          padding: 0.35rem 0.45rem;
        }

        .resume-diff-page {
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            inset 0 0 0 2px rgba(34, 197, 94, 0.18);
        }
      `}</style>

      {/* Font loading indicator (hidden, used by Puppeteer for PDF generation) */}
      <div
        data-font-loaded={isLoaded}
        data-font-family={fontFamily}
        style={{ display: "none" }}
      />

      <div ref={rootRef}>
        {isPrint ? (
          <div className="artboard-container">
            {layout.map((columns, pageIndex) => (
              <Page
                key={pageIndex}
                mode="preview"
                pageNumber={pageIndex + 1}
                className="page"
                style={{
                  width: `${pageSize.width * MM_TO_PX}px`,
                  minHeight: `${pageSize.height * MM_TO_PX}px`,
                }}
              >
                <TemplateComponent
                  columns={columns as [SectionKey[], SectionKey[]]}
                  isFirstPage={pageIndex === 0}
                />
              </Page>
            ))}
          </div>
        ) : (
          <TransformWrapper
            ref={transformRef}
            centerOnInit
            maxScale={2}
            minScale={0.4}
            initialScale={0.8}
            limitToBounds={false}
            wheel={{ wheelDisabled: wheelPanning }}
            panning={{ wheelPanning }}
          >
            <TransformComponent
              wrapperClass="!w-screen !h-screen"
              contentClass="artboard-container"
            >
              {layout.map((columns, pageIndex) => (
                <Page
                  key={pageIndex}
                  mode="builder"
                  pageNumber={pageIndex + 1}
                  className="page"
                  style={{
                    width: `${pageSize.width * MM_TO_PX}px`,
                    minHeight: `${pageSize.height * MM_TO_PX}px`,
                  }}
                >
                  <TemplateComponent
                    columns={columns as [SectionKey[], SectionKey[]]}
                    isFirstPage={pageIndex === 0}
                  />
                </Page>
              ))}
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>
    </>
  );
}

export default function ArtboardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";
  const resume = useArtboardStore((state) => state.resume);
  const setResume = useArtboardStore((state) => state.setResume);
  const setPreviewState = useArtboardStore((state) => state.setPreviewState);
  const resumeRecord = useQuery(
    api.resumes.getById,
    isPrint ? "skip" : { id: params.id as Id<"resumes"> },
  );
  const [isReady, setIsReady] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [wheelPanning, setWheelPanning] = useState(true);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const fontFamily = resume.metadata?.typography?.font?.family || "IBM Plex Sans";

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (
        event.data?.type === "RESUME_DATA" ||
        event.data?.type === "SET_RESUME"
      ) {
        const resumeData = event.data.payload as ResumeData;
        setResume(resumeData);
        setIsReady(true);
      }

      if (event.data?.type === "RESUME_PREVIEW_STATE") {
        const payload = event.data.payload as {
          currentResume: ResumeData;
          baseResume?: ResumeData | null;
          proposalResume?: ResumeData | null;
          diffMode?: boolean;
        };

        setPreviewState(payload);
        setIsReady(true);
      }

      if (event.data?.type === "ZOOM_IN") transformRef.current?.zoomIn(0.2);
      if (event.data?.type === "ZOOM_OUT") transformRef.current?.zoomOut(0.2);
      if (event.data?.type === "CENTER_VIEW") transformRef.current?.centerView();
      if (event.data?.type === "RESET_VIEW") {
        transformRef.current?.resetTransform(0);
        setTimeout(() => transformRef.current?.centerView(0.8, 0), 10);
      }
      if (event.data?.type === "TOGGLE_PAN_MODE") {
        setWheelPanning(event.data.panMode);
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "ARTBOARD_READY" }, "*");

    const storedResume = window.localStorage.getItem("resume");
    if (storedResume) {
      try {
        const resumeData = JSON.parse(storedResume) as ResumeData;
        setResume(resumeData);
        setIsReady(true);
      } catch (error) {
        console.error("Failed to parse stored resume:", error);
      }
    }

    setHasBootstrapped(true);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setPreviewState, setResume]);

  useEffect(() => {
    if (!resumeRecord?.data || isReady) return;

    setResume(resumeRecord.data);
    setIsReady(true);
  }, [isReady, resumeRecord, setResume]);

  if (!hasBootstrapped || (!isPrint && resumeRecord === undefined)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
        <div className="text-sm text-foreground/70">Loading artboard...</div>
      </div>
    );
  }

  if (!isReady) {
    const isUnavailable = !isPrint && resumeRecord === null;

    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">
            {isUnavailable ? "Resume unavailable" : "Waiting for resume data"}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {isUnavailable
              ? "This resume could not be loaded from the current session."
              : "Open this route from the builder or provide resume data via postMessage/localStorage."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <FontProvider fontFamily={fontFamily}>
      <ArtboardContent transformRef={transformRef} wheelPanning={wheelPanning} />
    </FontProvider>
  );
}
