import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Artboard",
};

export default function ArtboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/bold/style.css"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
