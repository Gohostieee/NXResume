"use client";

import { useBreakpoint } from "@/lib/hooks";
import { LeftSidebar } from "./sidebars/left/left-sidebar";
import { RightSidebar } from "./sidebars/right/right-sidebar";
import { PreviewPanel } from "./preview-panel";
import { AutoSave } from "./auto-save";
import { BuilderHeader } from "./builder-header";
import { BuilderToolbar } from "./builder-toolbar";
import { Panel, PanelGroup, PanelResizeHandle } from "@/components/ui/resizable-panel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useBuilderStore } from "@/stores/builder";

type BuilderLayoutProps = {
  resume: any;
};

const CenterSlot = () => (
  <div className="relative flex h-full flex-col">
    <AutoSave />
    <BuilderHeader />
    <PreviewPanel />
    <BuilderToolbar />
  </div>
);

export function BuilderLayout(_props: BuilderLayoutProps) {
  const { isDesktop } = useBreakpoint();
  const sheet = useBuilderStore((state) => state.sheet);
  const leftSetSize = useBuilderStore((state) => state.panel.left.setSize);
  const rightSetSize = useBuilderStore((state) => state.panel.right.setSize);
  const leftHandle = useBuilderStore((state) => state.panel.left.handle);
  const rightHandle = useBuilderStore((state) => state.panel.right.handle);

  if (isDesktop) {
    return (
      <div className="relative h-screen overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel
            minSize={25}
            maxSize={45}
            defaultSize={30}
            className={!leftHandle.isDragging ? "transition-[flex]" : ""}
            onResize={leftSetSize}
          >
            <LeftSidebar />
          </Panel>
          <PanelResizeHandle
            isDragging={leftHandle.isDragging}
            onDragging={leftHandle.setDragging}
          />
          <Panel>
            <CenterSlot />
          </Panel>
          <PanelResizeHandle
            isDragging={rightHandle.isDragging}
            onDragging={rightHandle.setDragging}
          />
          <Panel
            minSize={25}
            maxSize={45}
            defaultSize={30}
            className={!rightHandle.isDragging ? "transition-[flex]" : ""}
            onResize={rightSetSize}
          >
            <RightSidebar />
          </Panel>
        </PanelGroup>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      <Sheet open={sheet.left.open} onOpenChange={sheet.left.setOpen}>
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Resume Editor</SheetTitle>
            <SheetDescription>Resume content</SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        <SheetContent side="left" showClose={false} className="top-14 p-0 sm:max-w-xl">
          <LeftSidebar />
        </SheetContent>
      </Sheet>

      <CenterSlot />

      <Sheet open={sheet.right.open} onOpenChange={sheet.right.setOpen}>
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Resume settings</SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        <SheetContent side="right" showClose={false} className="top-14 p-0 sm:max-w-xl">
          <RightSidebar />
        </SheetContent>
      </Sheet>
    </div>
  );
}
