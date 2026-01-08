"use client";

import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";

import { helmetContext } from "../constants/helmet";
import { useArtboardStore } from "../store/artboard";

type Props = {
  children: React.ReactNode;
};

export const ArtboardProvider = ({ children }: Props) => {
  const resume = useArtboardStore((state) => state.resume);
  const setResume = useArtboardStore((state) => state.setResume);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === "SET_RESUME") setResume(event.data.payload);
    };

    window.addEventListener("message", handleMessage, false);

    return () => {
      window.removeEventListener("message", handleMessage, false);
    };
  }, [setResume]);

  useEffect(() => {
    const resumeData = window.localStorage.getItem("resume");

    if (resumeData) setResume(JSON.parse(resumeData));
  }, [setResume]);

  if (!resume) return null;

  return (
    <HelmetProvider context={helmetContext}>
      {children}
    </HelmetProvider>
  );
};
