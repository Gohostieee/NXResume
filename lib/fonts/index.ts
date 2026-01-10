import { isLocalFont } from "@/lib/utils/namespaces/fonts";

/**
 * Popular fonts that will be optimized with next/font/google.
 * These fonts are self-hosted and have zero layout shift.
 */
export const POPULAR_FONTS = [
  "IBM Plex Sans",
  "IBM Plex Serif",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans 3",
  "Raleway",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "PT Sans",
  "Noto Sans",
] as const;

export type PopularFont = (typeof POPULAR_FONTS)[number];

/**
 * Check if a font family is in the popular fonts list (case-insensitive).
 */
export const isPopularFont = (family: string): boolean =>
  POPULAR_FONTS.some((f) => f.toLowerCase() === family.toLowerCase());

/**
 * Get the normalized popular font name (proper casing).
 */
export const getPopularFontName = (family: string): PopularFont | null => {
  const found = POPULAR_FONTS.find(
    (f) => f.toLowerCase() === family.toLowerCase()
  );
  return found || null;
};

/**
 * Generate a Google Fonts CSS URL for a given font family.
 * Uses display=swap for better UX during loading.
 */
export const getGoogleFontUrl = (
  family: string,
  weights = "400;500;600;700"
): string => {
  const encodedFamily = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weights}&display=swap`;
};

/**
 * Determine the font tier for a given font family.
 * - "system": Local system fonts (no loading needed)
 * - "popular": Popular fonts (next/font optimized)
 * - "google": Other Google Fonts (dynamic loading)
 */
export type FontTier = "system" | "popular" | "google";

export const getFontTier = (family: string): FontTier => {
  if (isLocalFont(family)) return "system";
  if (isPopularFont(family)) return "popular";
  return "google";
};
