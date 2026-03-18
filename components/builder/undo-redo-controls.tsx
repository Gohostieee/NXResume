"use client";

import { ArrowClockwise, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useResumeStore } from "@/stores/resume";

type UndoRedoControlsProps = {
  className?: string;
};

export const UndoRedoControls = ({ className }: UndoRedoControlsProps) => {
  const undo = useResumeStore((state) => state.undo);
  const redo = useResumeStore((state) => state.redo);
  const canUndo = useResumeStore((state) => state.undoStack.length > 0);
  const canRedo = useResumeStore((state) => state.redoStack.length > 0);
  const checkedOutCommitId = useResumeStore((state) => state.checkedOutCommitId);
  const activeHeadCommitId = useResumeStore((state) => state.activeBranch?.headCommitId);
  const isReadonly = Boolean(checkedOutCommitId) && checkedOutCommitId !== activeHeadCommitId;

  return (
    <div className={className}>
      <Tooltip content="Undo">
        <Button size="icon" variant="ghost" className="rounded-none" onClick={() => undo()} disabled={!canUndo || isReadonly}>
          <ArrowCounterClockwise className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Redo">
        <Button size="icon" variant="ghost" className="rounded-none" onClick={() => redo()} disabled={!canRedo || isReadonly}>
          <ArrowClockwise className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  );
};
