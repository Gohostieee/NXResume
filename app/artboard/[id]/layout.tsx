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
    <div className={fontClassNames} style={{ margin: 0, padding: 0 }}>
      {children}
    </div>
  );
}
