"use client";

import { ReactNode } from "react";
import { ConvexClientProvider } from "./convex-provider";
import { UserSync } from "./user-sync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <UserSync />
      {children}
    </ConvexClientProvider>
  );
}
