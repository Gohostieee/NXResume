"use client";

import { ReactNode } from "react";
import { ConvexClientProvider } from "./convex-provider";
import { UserSync } from "./user-sync";
import { Toaster, TooltipProvider } from "../ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <TooltipProvider>
        <UserSync />
        {children}
        <Toaster />
      </TooltipProvider>
    </ConvexClientProvider>
  );
}
