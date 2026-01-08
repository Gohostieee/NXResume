"use client";

import { useEffect, useState } from "react";
import { useArtboardStore } from "@/components/artboard/store/artboard";
import { getTemplate } from "@/components/templates";
import { pageSizeMap } from "@/lib/utils";
import type { Template } from "@/lib/utils";
import type { ResumeData, SectionKey } from "@/lib/schema";

const MM_TO_PX = 3.78;

export default function ArtboardPage() {
  const resume = useArtboardStore((state) => state.resume);
  const setResume = useArtboardStore((state) => state.setResume);
  const [isReady, setIsReady] = useState(false);

  // Listen for postMessage from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "RESUME_DATA") {
        const resumeData = event.data.payload as ResumeData;
        setResume(resumeData);
        setIsReady(true);
      }
    };

    window.addEventListener("message", handleMessage);

    // Notify parent that artboard is ready to receive data
    window.parent.postMessage({ type: "ARTBOARD_READY" }, "*");

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setResume]);

  const templateName = (resume.metadata?.template || "rhyhorn") as Template;
  const TemplateComponent = getTemplate(templateName);
  const layout = resume.metadata?.layout || [[[]]];
  const pageFormat = resume.metadata?.page?.format || "a4";
  const pageSize = pageSizeMap[pageFormat];

  // Theme colors
  const primaryColor = resume.metadata?.theme?.primary || "#dc2626";
  const backgroundColor = resume.metadata?.theme?.background || "#ffffff";
  const textColor = resume.metadata?.theme?.text || "#000000";

  // Typography
  const fontFamily = resume.metadata?.typography?.font?.family || "IBM Plex Sans";
  const fontSize = resume.metadata?.typography?.font?.size || 14;
  const lineHeight = resume.metadata?.typography?.lineHeight || 1.5;
  const pageMargin = resume.metadata?.page?.margin || 18;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');

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
          font-family: "${fontFamily}", "IBM Plex Sans", sans-serif;
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
          width: ${pageSize.width * MM_TO_PX}px;
          min-height: ${pageSize.height * MM_TO_PX}px;
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

        .wysiwyg a {
          color: ${primaryColor};
          text-decoration: underline;
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
      `}</style>

      <div className="artboard-container">
        {!isReady ? (
          <div style={{ color: "white", padding: "2rem" }}>
            Waiting for resume data...
          </div>
        ) : (
          layout.map((columns, pageIndex) => (
            <div key={pageIndex} className="page">
              <TemplateComponent
                columns={columns as [SectionKey[], SectionKey[]]}
                isFirstPage={pageIndex === 0}
              />
            </div>
          ))
        )}
      </div>
    </>
  );
}
