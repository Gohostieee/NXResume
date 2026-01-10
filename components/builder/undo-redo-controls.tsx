"use client";

import { ArrowClockwise, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useTemporalResumeStore } from "@/stores/resume";

type UndoRedoControlsProps = {
  className?: string;
};

export const UndoRedoControls = ({ className }: UndoRedoControlsProps) => {
  const undo = useTemporalResumeStore((state) => state.undo);
  const redo = useTemporalResumeStore((state) => state.redo);
  const canUndo = useTemporalResumeStore((state) => (state.pastStates?.length ?? 0) > 0);
  const canRedo = useTemporalResumeStore((state) => (state.futureStates?.length ?? 0) > 0);

  return (
    <div className={className}>
      <Tooltip content="Undo">
        <Button size="icon" variant="ghost" className="rounded-none" onClick={() => undo()} disabled={!canUndo}>
          <ArrowCounterClockwise className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Redo">
        <Button size="icon" variant="ghost" className="rounded-none" onClick={() => redo()} disabled={!canRedo}>
          <ArrowClockwise className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  );
};
