"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useResumeStore } from "@/stores/resume";
import { useBuilderStore } from "@/stores/builder";

export function PreviewPanel() {
  const resume = useResumeStore((state) => state.resume);
  const commits = useResumeStore((state) => state.commits);
  const checkedOutCommitId = useResumeStore((state) => state.checkedOutCommitId);
  const proposal = useResumeStore((state) => state.proposal);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setFrameRef = useBuilderStore((state) => state.frame.setRef);
  const [isArtboardReady, setIsArtboardReady] = useState(false);
  const resumeId = resume?.id || resume?._id;
  const resumeData = resume?.data;
  const hasResumeData = Boolean(
    resumeData?.basics && resumeData?.sections && resumeData?.metadata,
  );

  // Send resume data to iframe
  const sendResumeData = useCallback(() => {
    if (iframeRef.current?.contentWindow && hasResumeData) {
      const checkedOutCommit = checkedOutCommitId
        ? commits.find((commit) => commit._id === checkedOutCommitId) ?? null
        : null;
      const parentCommit =
        checkedOutCommit?.parentCommitId
          ? commits.find((commit) => commit._id === checkedOutCommit.parentCommitId) ?? null
          : null;
      const historyDiffMode = Boolean(checkedOutCommit);

      iframeRef.current.contentWindow.postMessage(
        {
          type: "RESUME_PREVIEW_STATE",
          payload: {
            currentResume: resumeData,
            baseResume: proposal.isPreviewOpen
              ? proposal.baseSnapshot
              : historyDiffMode
                ? parentCommit?.snapshot.data ?? null
                : null,
            proposalResume: proposal.isPreviewOpen
              ? proposal.proposalSnapshot
              : historyDiffMode
                ? checkedOutCommit?.snapshot.data ?? resumeData
                : null,
            diffMode: proposal.isPreviewOpen || historyDiffMode,
          },
        },
        "*"
      );
    }
  }, [
    checkedOutCommitId,
    commits,
    proposal.baseSnapshot,
    proposal.isPreviewOpen,
    proposal.proposalSnapshot,
    hasResumeData,
    resumeData,
  ]);

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
    if (isArtboardReady && hasResumeData) {
      sendResumeData();
    }
  }, [hasResumeData, isArtboardReady, proposal, sendResumeData]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    // The artboard will send ARTBOARD_READY when it's initialized
  }, []);

  useEffect(() => {
    if (!iframeRef.current) return;
    setFrameRef(iframeRef.current);
    return () => setFrameRef(null);
  }, [setFrameRef, resumeId]);

  if (!hasResumeData) {
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
