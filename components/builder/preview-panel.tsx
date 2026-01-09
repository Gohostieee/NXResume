"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useResumeStore } from "@/stores/resume";
import { useBuilderStore } from "@/stores/builder";

export function PreviewPanel() {
  const resume = useResumeStore((state) => state.resume);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setFrameRef = useBuilderStore((state) => state.frame.setRef);
  const [isArtboardReady, setIsArtboardReady] = useState(false);
  const resumeId = resume?.id || resume?._id;

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
      if (event.origin !== window.location.origin) return;
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

  useEffect(() => {
    if (!iframeRef.current) return;
    setFrameRef(iframeRef.current);
    return () => setFrameRef(null);
  }, [setFrameRef, resumeId]);

  if (!resume?.data) {
    return (
      <main className="flex flex-1 items-center justify-center bg-secondary/30">
        <div className="text-foreground/60">Loading preview...</div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-secondary/30">
      <div className="flex flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={`/artboard/${resumeId}`}
          onLoad={handleIframeLoad}
          className="h-full w-full border-0"
          style={{ background: "transparent" }}
          title="Resume Preview"
        />
      </div>
    </main>
  );
}
