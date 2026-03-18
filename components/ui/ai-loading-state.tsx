import { Check, CircleNotch, Sparkle } from "@phosphor-icons/react";
import { cn } from "@reactive-resume/utils";

type AiLoadingStateProps = {
  title: string;
  description: string;
  stages: readonly string[];
  activeStage: number;
  compact?: boolean;
  blocking?: boolean;
  className?: string;
};

const clampStageIndex = (activeStage: number, stageCount: number) => {
  if (stageCount <= 0) return 0;
  return Math.min(Math.max(activeStage, 0), stageCount - 1);
};

export const AiLoadingState = ({
  title,
  description,
  stages,
  activeStage,
  compact = false,
  blocking = false,
  className,
}: AiLoadingStateProps) => {
  const resolvedStage = clampStageIndex(activeStage, stages.length);
  const currentStageLabel = stages[resolvedStage] ?? title;

  return (
    <div
      aria-busy="true"
      className={cn(
        blocking
          ? "absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/82 px-4 py-6 backdrop-blur-sm"
          : "w-full",
        className,
      )}
    >
      <div
        className={cn(
          "w-full rounded-2xl border border-border/70 bg-gradient-to-br from-sky-50 via-background to-emerald-50 shadow-sm",
          compact ? "max-w-lg p-5" : "max-w-2xl p-6",
        )}
        role="status"
      >
        <p className="sr-only" aria-live="polite">
          {currentStageLabel}
        </p>

        <div className={cn("flex items-start gap-4", compact ? "flex-col" : "flex-col sm:flex-row")}>
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-200/70 bg-background/90 shadow-sm">
            <div className="absolute inset-0 rounded-2xl border border-sky-200/60 motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-sky-100 via-background to-emerald-100" />
            <div className="relative flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400 motion-safe:animate-bounce motion-reduce:animate-none" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 motion-safe:animate-bounce motion-reduce:animate-none [animation-delay:140ms]" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 motion-safe:animate-bounce motion-reduce:animate-none [animation-delay:280ms]" />
            </div>
            <Sparkle className="absolute -right-1 -top-1 h-5 w-5 text-sky-500 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={cn("font-semibold text-foreground", compact ? "text-base" : "text-lg")}>
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/70">{description}</p>

            <div className="mt-4 space-y-2.5">
              {stages.map((stage, index) => {
                const isDone = index < resolvedStage;
                const isCurrent = index === resolvedStage;

                return (
                  <div
                    key={stage}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      isCurrent
                        ? "border-sky-300 bg-sky-50 text-sky-950"
                        : isDone
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                          : "border-border/70 bg-background/80 text-foreground/55",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                        isCurrent
                          ? "border-sky-200 bg-sky-100 text-sky-700"
                          : isDone
                            ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                            : "border-border bg-secondary/30 text-foreground/45",
                      )}
                    >
                      {isCurrent ? (
                        <CircleNotch className="h-4 w-4 motion-safe:animate-spin motion-reduce:animate-none" />
                      ) : isDone ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium">{stage}</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-current/70">
                        {isCurrent ? "In progress" : isDone ? "Done" : "Pending"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
