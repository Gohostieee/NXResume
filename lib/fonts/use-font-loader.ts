"use client";

import { useEffect, useState, useCallback } from "react";
import { isLocalFont } from "@/lib/utils/namespaces/fonts";
import { isPopularFont, getGoogleFontUrl } from "./index";
import { getNextFontClassName, getNextFontFamily } from "./next-fonts";

export type FontStatus = "loading" | "loaded" | "error";

export interface UseFontLoaderResult {
  /** Current loading status */
  status: FontStatus;
  /** The font family name */
  fontFamily: string;
  /** CSS className for next/font (null for non-popular fonts) */
  className: string | null;
  /** CSS font-family value to use */
  fontFamilyCSS: string;
}

// Track loaded fonts globally to avoid duplicate loading
const loadedFonts = new Set<string>();

/**
 * Hook to load and track font status.
 * Handles three tiers of fonts:
 * 1. System fonts - instant, no loading
 * 2. Popular fonts - next/font optimized, pre-loaded
 * 3. Other Google Fonts - dynamic link tag injection
 */
export function useFontLoader(fontFamily: string): UseFontLoaderResult {
  const [status, setStatus] = useState<FontStatus>(() => {
    // Check initial state
    if (isLocalFont(fontFamily)) return "loaded";
    if (isPopularFont(fontFamily)) return "loaded";
    if (loadedFonts.has(fontFamily)) return "loaded";
    return "loading";
  });

  const loadFont = useCallback(async () => {
    // 1. System font - no loading needed
    if (isLocalFont(fontFamily)) {
      setStatus("loaded");
      return;
    }

    // 2. Popular font with next/font - already loaded
    if (isPopularFont(fontFamily)) {
      setStatus("loaded");
      return;
    }

    // 3. Already loaded this font
    if (loadedFonts.has(fontFamily)) {
      setStatus("loaded");
      return;
    }

    // 4. Load via link tag
    setStatus("loading");

    try {
      // Check if link already exists
      const existingLink = document.querySelector(
        `link[data-font-family="${fontFamily}"]`
      );

      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = getGoogleFontUrl(fontFamily);
        link.setAttribute("data-font-family", fontFamily);

        // Wait for stylesheet to load
        await new Promise<void>((resolve, reject) => {
          link.onload = () => resolve();
          link.onerror = () =>
            reject(new Error(`Failed to load font: ${fontFamily}`));
          document.head.appendChild(link);
        });

        // Wait for font face to be ready
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      }

      loadedFonts.add(fontFamily);
      setStatus("loaded");
    } catch (error) {
      console.error("Font loading error:", error);
      setStatus("error");
    }
  }, [fontFamily]);

  useEffect(() => {
    loadFont();
  }, [loadFont]);

  // Get className for next/font fonts
  const className = isPopularFont(fontFamily)
    ? getNextFontClassName(fontFamily)
    : null;

  // Build CSS font-family value
  let fontFamilyCSS: string;
  if (isPopularFont(fontFamily)) {
    // Use the optimized next/font family value with fallback
    const nextFontFamily = getNextFontFamily(fontFamily);
    fontFamilyCSS = nextFontFamily || `"${fontFamily}", sans-serif`;
  } else {
    // Use the font family name with IBM Plex Sans as fallback
    fontFamilyCSS = `"${fontFamily}", "IBM Plex Sans", sans-serif`;
  }

  return { status, fontFamily, className, fontFamilyCSS };
}
