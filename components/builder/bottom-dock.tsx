"use client";

import { BuilderToolbar } from "./builder-toolbar";

export const BuilderBottomDock = () => {
  return (
    <div className="fixed inset-x-0 bottom-4 z-20 hidden justify-center md:flex">
      <div className="rounded-2xl border bg-background/95 px-2 py-2 shadow-lg backdrop-blur">
        <BuilderToolbar />
      </div>
    </div>
  );
};
