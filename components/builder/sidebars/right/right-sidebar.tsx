"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useResumeStore } from "@/stores/resume";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsSidebar } from "./settings-sidebar";
import { AiActionsTab } from "./sections/ai-actions-tab";

type RightSidebarTab = "settings" | "ai";

export function RightSidebar() {
  const resume = useResumeStore((state) => state.resume);
  const [activeTab, setActiveTab] = useState<RightSidebarTab>("settings");

  const isTailoredResume = resume?.scope === "application_tailored";
  const applicationId = resume?.applicationId;

  const application = useQuery(
    api.applications.getById,
    isTailoredResume && applicationId
      ? { id: applicationId as Id<"applications"> }
      : "skip",
  );

  useEffect(() => {
    if (!isTailoredResume && activeTab !== "settings") {
      setActiveTab("settings");
    }
  }, [activeTab, isTailoredResume]);

  if (!isTailoredResume) {
    return <SettingsSidebar />;
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as RightSidebarTab)}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="border-b border-l p-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="ai">AI Actions</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="settings" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
        <SettingsSidebar />
      </TabsContent>

      <TabsContent value="ai" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
        <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              <AiActionsTab application={application as any} enabled={isTailoredResume} />
            </div>
          </ScrollArea>
        </aside>
      </TabsContent>
    </Tabs>
  );
}
