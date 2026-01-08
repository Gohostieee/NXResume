"use client";

import { createId } from "@paralleldrive/cuid2";
import { CopySimple, PencilSimple, Plus } from "@phosphor-icons/react";
import type { SectionItem, SectionWithItem } from "@/lib/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form } from "@/components/ui/form";
import { produce } from "immer";
import get from "lodash.get";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { DialogName } from "@/stores/dialog";
import { useDialog } from "@/stores/dialog";
import { useResumeStore } from "@/stores/resume";
import { useAutoSaveStore } from "@/stores/auto-save";

type Props<T extends SectionItem> = {
  id: DialogName;
  form: UseFormReturn<T>;
  defaultValues: T;
  pendingKeyword?: string;
  children: React.ReactNode;
};

export const SectionDialog = <T extends SectionItem>({
  id,
  form,
  defaultValues,
  pendingKeyword,
  children,
}: Props<T>) => {
  const { isOpen, mode, close, payload } = useDialog<T>(id);

  const setValue = useResumeStore((state) => state.setValue);
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);
  const section = useResumeStore((state) => {
    return get(state.resume?.data?.sections, id);
  }) as SectionWithItem<T> | null;

  const isCreate = mode === "create";
  const isUpdate = mode === "update";
  const isDelete = mode === "delete";
  const isDuplicate = mode === "duplicate";

  useEffect(() => {
    if (isOpen) onReset();
  }, [isOpen, payload]);

  const onSubmit = (values: T) => {
    if (!section) return;

    if (isCreate || isDuplicate) {
      if (pendingKeyword && "keywords" in values) {
        (values.keywords as string[]).push(pendingKeyword);
      }

      setValue(
        `sections.${id}.items`,
        produce(section.items, (draft: T[]): void => {
          draft.push({ ...values, id: createId() });
        }),
      );
    }

    if (isUpdate) {
      if (!payload.item?.id) return;

      if (pendingKeyword && "keywords" in values) {
        (values.keywords as string[]).push(pendingKeyword);
      }

      setValue(
        `sections.${id}.items`,
        produce(section.items, (draft: T[]): void => {
          const index = draft.findIndex((item) => item.id === payload.item?.id);
          if (index === -1) return;
          draft[index] = values;
        }),
      );
    }

    if (isDelete) {
      if (!payload.item?.id) return;

      setValue(
        `sections.${id}.items`,
        produce(section.items, (draft: T[]): void => {
          const index = draft.findIndex((item) => item.id === payload.item?.id);
          if (index === -1) return;
          draft.splice(index, 1);
        }),
      );
    }

    // Trigger save after dialog closes
    close();
    triggerSave();
  };

  const onReset = () => {
    if (isCreate) form.reset({ ...defaultValues, id: createId() } as T);
    if (isUpdate) form.reset({ ...defaultValues, ...payload.item });
    if (isDuplicate) form.reset({ ...payload.item, id: createId() } as T);
    if (isDelete) form.reset({ ...defaultValues, ...payload.item });
  };

  if (isDelete) {
    return (
      <AlertDialog open={isOpen} onOpenChange={close}>
        <AlertDialogContent className="z-50">
          <Form {...form}>
            <form>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The item will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="z-50 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  {isCreate && <Plus className="h-5 w-5" />}
                  {isUpdate && <PencilSimple className="h-5 w-5" />}
                  {isDuplicate && <CopySimple className="h-5 w-5" />}
                  <span>
                    {isCreate && "Create a new item"}
                    {isUpdate && "Update item"}
                    {isDuplicate && "Duplicate item"}
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="px-1">{children}</div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">
                {isCreate && "Create"}
                {isUpdate && "Save Changes"}
                {isDuplicate && "Duplicate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
