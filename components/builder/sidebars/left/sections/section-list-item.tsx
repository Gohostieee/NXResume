"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CopySimple, DotsSixVertical, Eye, EyeSlash, PencilSimple, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  visible?: boolean;
  title: string;
  description?: string;
  onUpdate: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
};

export const SectionListItem = ({
  id,
  visible = true,
  title,
  description,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleVisibility,
}: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-background p-3 transition-colors",
        isDragging && "opacity-50",
        !visible && "opacity-50"
      )}
    >
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical className="h-4 w-4" />
      </Button>

      <div
        className="flex-1 cursor-pointer truncate"
        onClick={onUpdate}
      >
        <p className="font-medium truncate">{title || "(Untitled)"}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onToggleVisibility}
        >
          {visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeSlash className="h-4 w-4" />
          )}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onDuplicate}
        >
          <CopySimple className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onUpdate}
        >
          <PencilSimple className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
