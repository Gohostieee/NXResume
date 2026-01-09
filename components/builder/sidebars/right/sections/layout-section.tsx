"use client";

import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowCounterClockwise, DotsSixVertical, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import type { LayoutLocator, SortablePayload } from "@/lib/utils";
import { moveItemInLayout, parseLayoutLocator } from "@/lib/utils";
import get from "lodash.get";
import { useState } from "react";

import { defaultMetadata } from "@/lib/schema";
import { useResumeStore } from "@/stores/resume";

type ColumnProps = {
  id: string;
  name: string;
  items: string[];
};

const Column = ({ id, name, items }: ColumnProps) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div className="relative">
        <div className="absolute inset-0 w-3/4 rounded bg-secondary/60" />

        <div className="relative z-10 p-3 pb-6">
          <p className="mb-2 text-xs font-bold">{name}</p>

          <div ref={setNodeRef} className="space-y-2">
            {items.map((section) => (
              <SortableSection key={section} id={section} />
            ))}
          </div>
        </div>
      </div>
    </SortableContext>
  );
};

type SortableSectionProps = {
  id: string;
};

const SortableSection = ({ id }: SortableSectionProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transition,
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Section id={id} />
    </div>
  );
};

type SectionProps = {
  id: string;
  isDragging?: boolean;
};

const Section = ({ id, isDragging = false }: SectionProps) => {
  const name = useResumeStore((state) => get(state.resume.data.sections, `${id}.name`, id));

  return (
    <div
      className={[
        "cursor-grab rounded bg-primary px-2 py-1 text-xs text-primary-foreground transition-colors",
        "hover:bg-primary-accent",
        isDragging ? "cursor-grabbing opacity-80" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-x-2">
        <DotsSixVertical className="h-3 w-3" />
        <p className="flex-1 truncate">{name}</p>
      </div>
    </div>
  );
};

export const LayoutSection = () => {
  const setValue = useResumeStore((state) => state.setValue);
  const layout = useResumeStore((state) => state.resume.data.metadata.layout);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const onDragCancel = () => {
    setActiveId(null);
  };

  const onDragEvent = ({ active, over }: DragOverEvent | DragEndEvent) => {
    if (!over || !active.data.current) return;

    const currentPayload = active.data.current.sortable as SortablePayload | null;
    const current = parseLayoutLocator(currentPayload);

    if (active.id === over.id) return;

    if (!over.data.current) {
      const [page, column] = (over.id as string).split(".").map(Number);
      const target = { page, column, section: 0 } as LayoutLocator;

      const newLayout = moveItemInLayout(current, target, layout);
      setValue("metadata.layout", newLayout);

      return;
    }

    const targetPayload = over.data.current.sortable as SortablePayload | null;
    const target = parseLayoutLocator(targetPayload);

    const newLayout = moveItemInLayout(current, target, layout);
    setValue("metadata.layout", newLayout);
  };

  const onDragEnd = (event: DragEndEvent) => {
    onDragEvent(event);
    setActiveId(null);
  };

  const onAddPage = () => {
    const layoutCopy = JSON.parse(JSON.stringify(layout));
    layoutCopy.push([[], []]);
    setValue("metadata.layout", layoutCopy);
  };

  const onRemovePage = (page: number) => {
    const layoutCopy = JSON.parse(JSON.stringify(layout));

    layoutCopy[0][0].push(...layoutCopy[page][0]);
    layoutCopy[0][1].push(...layoutCopy[page][1]);
    layoutCopy.splice(page, 1);

    setValue("metadata.layout", layoutCopy);
  };

  const onResetLayout = () => {
    const layoutCopy = JSON.parse(JSON.stringify(defaultMetadata.layout));

    const customSections: string[] = [];

    for (const page of layout) {
      for (const column of page) {
        customSections.push(...column.filter((section) => section.startsWith("custom.")));
      }
    }

    if (customSections.length > 0) layoutCopy[0][0].push(...customSections);
    setValue("metadata.layout", layoutCopy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Layout</h4>
        <Tooltip content="Reset Layout">
          <Button size="icon" variant="ghost" onClick={onResetLayout}>
            <ArrowCounterClockwise className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>

      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          onDragCancel={onDragCancel}
        >
          {layout.map((page, pageIndex) => {
            const mainIndex = `${pageIndex}.0`;
            const sidebarIndex = `${pageIndex}.1`;

            const main = page[0];
            const sidebar = page[1];
            const pageNumber = pageIndex + 1;

            return (
              <div key={pageIndex} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <p className="mb-2 text-xs font-bold">Page {pageNumber}</p>
                  {pageIndex !== 0 && (
                    <Tooltip content="Remove Page">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          onRemovePage(pageIndex);
                        }}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </Tooltip>
                  )}
                </div>

                <div className="grid grid-cols-2 items-start gap-x-3">
                  <Column id={mainIndex} name="Main" items={main} />
                  <Column id={sidebarIndex} name="Sidebar" items={sidebar} />
                </div>
              </div>
            );
          })}

          <Portal>
            <DragOverlay>{activeId && <Section isDragging id={activeId} />}</DragOverlay>
          </Portal>
        </DndContext>

        <Button variant="outline" className="w-full" onClick={onAddPage}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Page
        </Button>
      </div>
    </div>
  );
};
