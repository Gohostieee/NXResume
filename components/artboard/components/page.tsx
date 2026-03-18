import { useEffect, useRef, useState } from "react";
import { useTheme } from "@reactive-resume/hooks";
import { cn, pageSizeMap } from "@reactive-resume/utils";

import { useArtboardStore } from "../store/artboard";

type Props = {
  mode?: "preview" | "builder";
  pageNumber: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const MM_TO_PX = 3.78;

export const Page = ({ mode = "preview", pageNumber, children, className, style }: Props) => {
  const { isDarkMode } = useTheme();

  const page = useArtboardStore((state) => state.resume.metadata.page);
  const fontFamily = useArtboardStore((state) => state.resume.metadata.typography.font.family);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageBreakOffsets, setPageBreakOffsets] = useState<number[]>([]);
  const pageHeightPx = pageSizeMap[page.format].height * MM_TO_PX;

  useEffect(() => {
    const element = pageRef.current;

    if (!element || mode !== "builder" || !page.options.breakLine) {
      setPageBreakOffsets([]);
      return;
    }

    const updatePageBreaks = () => {
      const breakCount = Math.max(0, Math.ceil(element.scrollHeight / pageHeightPx) - 1);
      const offsets = Array.from({ length: breakCount }, (_, index) => (index + 1) * pageHeightPx);

      setPageBreakOffsets((current) => {
        if (
          current.length === offsets.length &&
          current.every((offset, index) => offset === offsets[index])
        ) {
          return current;
        }

        return offsets;
      });
    };

    updatePageBreaks();

    const resizeObserver = new ResizeObserver(() => {
      updatePageBreaks();
    });

    resizeObserver.observe(element);
    window.addEventListener("resize", updatePageBreaks);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePageBreaks);
    };
  }, [mode, page.options.breakLine, pageHeightPx]);

  return (
    <div
      ref={pageRef}
      data-page={pageNumber}
      data-page-height={pageHeightPx}
      className={cn(
        "relative bg-background text-foreground",
        mode === "builder" && "shadow-2xl",
        className,
      )}
      style={{
        fontFamily,
        width: `${pageSizeMap[page.format].width * MM_TO_PX}px`,
        minHeight: `${pageHeightPx}px`,
        ...style,
      }}
    >
      {mode === "builder" && page.options.pageNumbers && (
        <div className={cn("absolute -top-7 left-0 font-bold", isDarkMode && "text-white")}>
          Page {pageNumber}
        </div>
      )}

      {children}

      {mode === "builder" &&
        page.options.breakLine &&
        pageBreakOffsets.map((offset) => (
          <div
            key={offset}
            className="pointer-events-none absolute inset-x-0 border-b border-dashed"
            style={{ top: `${offset}px` }}
          />
        ))}
    </div>
  );
};
