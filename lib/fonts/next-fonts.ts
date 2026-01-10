import {
  IBM_Plex_Sans,
  IBM_Plex_Serif,
  Inter,
  Roboto,
  Open_Sans,
  Lato,
  Montserrat,
  Poppins,
  Source_Sans_3,
  Raleway,
  Nunito,
  Playfair_Display,
  Merriweather,
  PT_Sans,
  Noto_Sans,
} from "next/font/google";

// Configure each font with common weights
const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

const ibmPlexSerif = IBM_Plex_Serif({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-serif",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

const openSans = Open_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
});

const lato = Lato({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lato",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

const sourceSans3 = Source_Sans_3({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans-3",
});

const raleway = Raleway({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-raleway",
});

const nunito = Nunito({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

const playfairDisplay = Playfair_Display({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair-display",
});

const merriweather = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-merriweather",
});

const ptSans = PT_Sans({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pt-sans",
});

const notoSans = Noto_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans",
});

/**
 * Font configuration type from next/font
 */
type NextFontConfig = {
  className: string;
  style: { fontFamily: string };
  variable: string;
};

/**
 * Map of popular font family names to their next/font configurations.
 */
export const nextFonts: Record<string, NextFontConfig> = {
  "IBM Plex Sans": ibmPlexSans,
  "IBM Plex Serif": ibmPlexSerif,
  Inter: inter,
  Roboto: roboto,
  "Open Sans": openSans,
  Lato: lato,
  Montserrat: montserrat,
  Poppins: poppins,
  "Source Sans 3": sourceSans3,
  Raleway: raleway,
  Nunito: nunito,
  "Playfair Display": playfairDisplay,
  Merriweather: merriweather,
  "PT Sans": ptSans,
  "Noto Sans": notoSans,
};

/**
 * Get the next/font className for a popular font.
 * Returns null if the font is not in the popular fonts list.
 */
export const getNextFontClassName = (family: string): string | null => {
  const font = nextFonts[family];
  return font?.className || null;
};

/**
 * Get the CSS font-family value for a popular font.
 * Returns null if the font is not in the popular fonts list.
 */
export const getNextFontFamily = (family: string): string | null => {
  const font = nextFonts[family];
  return font?.style.fontFamily || null;
};

/**
 * Get all next/font class names combined (for applying to root element).
 */
export const getAllNextFontClassNames = (): string => {
  return Object.values(nextFonts)
    .map((font) => font.className)
    .join(" ");
};

/**
 * Get all next/font CSS variables combined (for applying to root element).
 */
export const getAllNextFontVariables = (): string => {
  return Object.values(nextFonts)
    .map((font) => font.variable)
    .join(" ");
};
