"use client";

import { useState } from "react";
import { cn } from "@reactive-resume/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiEditor } from "./ai-editor";
import { BuilderToolbar } from "./builder-toolbar";
import { UndoRedoControls } from "./undo-redo-controls";

type DockTab = "tools" | "ai";

export const BuilderBottomDock = () => {
  const [activeTab, setActiveTab] = useState<DockTab>("tools");
  const isTools = activeTab === "tools";

  return (
    <div className="fixed inset-x-0 bottom-4 z-20 hidden justify-center md:flex">
      <div
        className={cn(
          "rounded-2xl border bg-background/95 shadow-lg backdrop-blur",
          isTools ? "px-2 py-2" : "w-[min(760px,94vw)] px-3 py-3",
        )}
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DockTab)}>
          <div
            className={cn(
              "flex items-center gap-3",
              isTools ? "flex-wrap justify-center" : "justify-between",
            )}
          >
            <TabsList className="h-8 px-1">
              <TabsTrigger value="tools" className="px-3 py-1 text-xs">
                Tools
              </TabsTrigger>
              <TabsTrigger value="ai" className="px-3 py-1 text-xs">
                AI Editor
              </TabsTrigger>
            </TabsList>
            {isTools ? (
              <BuilderToolbar />
            ) : (
              <div className="flex items-center gap-3">
                <UndoRedoControls className="flex items-center" />
                <span className="text-xs text-foreground/60">
                  Changes apply directly to your resume.
                </span>
              </div>
            )}
          </div>

          {!isTools && <div className="mt-2"><AiEditor /></div>}
        </Tabs>
      </div>
    </div>
  );
};
