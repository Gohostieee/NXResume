import type { Metadata } from "next";
import { getAllNextFontClassNames } from "@/lib/fonts/next-fonts";

export const metadata: Metadata = {
  title: "Resume Artboard",
};

// Get all next/font class names for the layout
const fontClassNames = getAllNextFontClassNames();

export default function ArtboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontClassNames}>
      <head>
        {/* Preconnect for faster Google Fonts loading (for non-popular fonts) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Phosphor icons */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/bold/style.css"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
