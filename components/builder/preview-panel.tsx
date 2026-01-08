"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useResumeStore } from "@/stores/resume";
import { pageSizeMap } from "@/lib/utils";

const MM_TO_PX = 3.78;

export function PreviewPanel() {
  const resume = useResumeStore((state) => state.resume);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isArtboardReady, setIsArtboardReady] = useState(false);
  const [scale, setScale] = useState(0.6);

  // Send resume data to iframe
  const sendResumeData = useCallback(() => {
    if (iframeRef.current?.contentWindow && resume?.data) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "RESUME_DATA",
          payload: resume.data,
        },
        "*"
      );
    }
  }, [resume?.data]);

  // Listen for artboard ready message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ARTBOARD_READY") {
        setIsArtboardReady(true);
        // Send initial data when artboard is ready
        sendResumeData();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendResumeData]);

  // Send data whenever resume changes and artboard is ready
  useEffect(() => {
    if (isArtboardReady && resume?.data) {
      sendResumeData();
    }
  }, [isArtboardReady, resume?.data, sendResumeData]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    // The artboard will send ARTBOARD_READY when it's initialized
  }, []);

  if (!resume?.data) {
    return (
      <main className="flex flex-1 items-center justify-center bg-secondary/30">
        <div className="text-foreground/60">Loading preview...</div>
      </main>
    );
  }

  const pageFormat = resume.data.metadata?.page?.format || "a4";
  const pageSize = pageSizeMap[pageFormat];
  const iframeWidth = pageSize.width * MM_TO_PX;
  const iframeHeight = pageSize.height * MM_TO_PX;

  // Calculate scale to fit the container while maintaining aspect ratio
  // We use a wrapper to apply transform scaling for better performance

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-secondary/30">
      {/* Zoom controls */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-sm">
        <button
          onClick={() => setScale((s) => Math.max(0.25, s - 0.1))}
          className="rounded px-2 py-1 hover:bg-secondary"
        >
          -
        </button>
        <span className="min-w-[4rem] text-center text-sm">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(1.5, s + 0.1))}
          className="rounded px-2 py-1 hover:bg-secondary"
        >
          +
        </button>
        <button
          onClick={() => setScale(0.6)}
          className="ml-2 rounded px-2 py-1 text-sm hover:bg-secondary"
        >
          Reset
        </button>
      </div>

      {/* Iframe container with scrolling */}
      <div className="flex flex-1 justify-center overflow-auto p-8">
        <div
          className="origin-top"
          style={{
            width: iframeWidth * scale,
            height: "auto",
            minHeight: iframeHeight * scale,
          }}
        >
          <iframe
            ref={iframeRef}
            src={`/artboard/${resume.id}`}
            onLoad={handleIframeLoad}
            className="border-0"
            style={{
              width: iframeWidth,
              height: iframeHeight * 2, // Allow for multiple pages
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              background: "transparent",
              display: "block",
            }}
            title="Resume Preview"
          />
        </div>
      </div>
    </main>
  );
}
