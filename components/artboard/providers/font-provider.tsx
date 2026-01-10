"use client";

import { createContext, useContext } from "react";
import { useFontLoader, type FontStatus } from "@/lib/fonts/use-font-loader";

interface FontContextValue {
  /** The current font family name */
  fontFamily: string;
  /** Whether the font has finished loading */
  isLoaded: boolean;
  /** Current loading status */
  status: FontStatus;
  /** CSS className for next/font (null for non-popular fonts) */
  fontClassName: string | null;
  /** CSS font-family value to use in styles */
  fontFamilyCSS: string;
}

const FontContext = createContext<FontContextValue>({
  fontFamily: "IBM Plex Sans",
  isLoaded: false,
  status: "loading",
  fontClassName: null,
  fontFamilyCSS: '"IBM Plex Sans", sans-serif',
});

export function useFontContext() {
  return useContext(FontContext);
}

interface FontProviderProps {
  fontFamily: string;
  children: React.ReactNode;
}

export function FontProvider({ fontFamily, children }: FontProviderProps) {
  const { status, className, fontFamilyCSS } = useFontLoader(fontFamily);

  const value: FontContextValue = {
    fontFamily,
    isLoaded: status === "loaded",
    status,
    fontClassName: className,
    fontFamilyCSS,
  };

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}
