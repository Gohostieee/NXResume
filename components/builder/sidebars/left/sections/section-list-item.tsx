"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CopySimple,
  DotsSixVertical,
  Eye,
  EyeSlash,
  List,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type PreviewLayoutMode = "full" | "compact";

type SegmenterLike = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const createSegmenter = (): SegmenterLike | null => {
  if (typeof Intl === "undefined") return null;

  const maybeIntl = Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity: "grapheme" },
    ) => SegmenterLike;
  };

  if (!maybeIntl.Segmenter) return null;
  return new maybeIntl.Segmenter(undefined, { granularity: "grapheme" });
};

const segmenter = createSegmenter();

const toGraphemes = (value: string) => {
  if (segmenter) return Array.from(segmenter.segment(value), (item) => item.segment);
  return Array.from(value);
};

const truncateByGrapheme = (value: string, maxChars: number) => {
  const graphemes = toGraphemes(value);
  if (graphemes.length <= maxChars) return value;

  return `${graphemes.slice(0, maxChars).join("").trimEnd()}...`;
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
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [rowWidth, setRowWidth] = useState(320);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      rowRef.current = node;
    },
    [setNodeRef],
  );

  useEffect(() => {
    const node = rowRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const updateWidth = (nextWidth: number) => {
      const rounded = Math.round(nextWidth);
      setRowWidth((current) => (current === rounded ? current : rounded));
    };

    updateWidth(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (!next) return;
      updateWidth(next);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const layoutMode: PreviewLayoutMode = rowWidth < 420 ? "compact" : "full";

  const { previewTitle, previewDescription } = useMemo(() => {
    const reservedPx = layoutMode === "full" ? 210 : 96;
    const textPx = Math.max(80, rowWidth - reservedPx);
    const titleChars = clamp(Math.floor(textPx / 7.2), 12, 96);
    const descriptionChars = clamp(Math.floor(textPx / 7.8), 10, 120);

    return {
      previewTitle: truncateByGrapheme(title || "(Untitled)", titleChars),
      previewDescription: description ? truncateByGrapheme(description, descriptionChars) : undefined,
    };
  }, [description, layoutMode, rowWidth, title]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        "group flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border bg-background p-3 transition-colors",
        isDragging && "opacity-50",
        !visible && "opacity-50",
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

      <div className="w-0 min-w-0 flex-1 cursor-pointer" onClick={onUpdate}>
        <p className="truncate font-medium">{previewTitle}</p>
        {previewDescription && <p className="truncate text-xs text-muted-foreground">{previewDescription}</p>}
      </div>

      {layoutMode === "compact" ? (
        <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Item actions">
                <List className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onToggleVisibility}>
                {visible ? <Eye className="mr-2 h-4 w-4" /> : <EyeSlash className="mr-2 h-4 w-4" />}
                {visible ? "Hide" : "Show"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <CopySimple className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onUpdate}>
                <PencilSimple className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="shrink-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onToggleVisibility}>
            {visible ? <Eye className="h-4 w-4" /> : <EyeSlash className="h-4 w-4" />}
          </Button>

          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDuplicate}>
            <CopySimple className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onUpdate}>
            <PencilSimple className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive h-7 w-7"
            onClick={onDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
