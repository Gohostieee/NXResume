"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CaretRight, Plus } from "@phosphor-icons/react";
import type { SectionItem, SectionKey, SectionWithItem } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import get from "lodash.get";
import { SectionOptions } from "./section-options";

import { useDialog } from "@/stores/dialog";
import { useResumeStore } from "@/stores/resume";
import { SectionListItem } from "./section-list-item";

type Props<T extends SectionItem> = {
  id: SectionKey;
  title: (item: T) => string;
  description?: (item: T) => string | undefined;
};

export const SectionBase = <T extends SectionItem>({ id, title, description }: Props<T>) => {
  const { open } = useDialog(id);
  const collapsed = useResumeStore((state) => state.collapsedSections[id] ?? false);
  const toggleCollapseSection = useResumeStore((state) => state.toggleCollapseSection);

  const setValue = useResumeStore((state) => state.setValue);
  const section = useResumeStore(
    (state) => get(state.resume?.data?.sections, id) as SectionWithItem<T> | undefined,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!section) return null;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = section.items.findIndex((item) => item.id === active.id);
      const newIndex = section.items.findIndex((item) => item.id === over.id);

      const sortedList = arrayMove(section.items as T[], oldIndex, newIndex);
      setValue(`sections.${id}.items`, sortedList);
    }
  };

  const onCreate = () => {
    open("create", { id });
  };

  const onUpdate = (item: T) => {
    open("update", { id, item });
  };

  const onDuplicate = (item: T) => {
    open("duplicate", { id, item });
  };

  const onDelete = (item: T) => {
    open("delete", { id, item });
  };

  const onToggleVisibility = (index: number) => {
    const visible = get(section, `items[${index}].visible`, true);
    setValue(`sections.${id}.items[${index}].visible`, !visible);
  };

  return (
    <section id={id} className="space-y-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            aria-label={collapsed ? "Expand section" : "Collapse section"}
            onClick={() => {
              toggleCollapseSection(id);
            }}
          >
            <CaretRight className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-90")} />
          </Button>
          <h3 className="font-semibold">{section.name}</h3>
          <span className="text-xs text-muted-foreground">({section.items.length})</span>
        </div>

        <div className="flex items-center gap-1">
          <SectionOptions id={id} />
          <Button size="sm" variant="ghost" onClick={onCreate}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {!collapsed && (
        <div className={cn("space-y-2", !section.visible && "opacity-50")}>
          {section.items.length === 0 ? (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={onCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add a new item
            </Button>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToParentElement]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={section.items} strategy={verticalListSortingStrategy}>
                {section.items.map((item, index) => (
                  <SectionListItem
                    key={item.id}
                    id={item.id}
                    visible={item.visible}
                    title={title(item as T)}
                    description={description?.(item as T)}
                    onUpdate={() => onUpdate(item as T)}
                    onDelete={() => onDelete(item as T)}
                    onDuplicate={() => onDuplicate(item as T)}
                    onToggleVisibility={() => onToggleVisibility(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {section.items.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add a new item
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
