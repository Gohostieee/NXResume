"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { ToastActionElement, ToastProps } from "./toast";

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 1000;

type ToastEntry = ToastProps & {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
};

type ToastState = {
  toasts: ToastEntry[];
};

type ToastPayload = Omit<ToastEntry, "id">;

const listeners = new Set<(state: ToastState) => void>();
let memoryState: ToastState = { toasts: [] };

const emit = () => {
  for (const listener of listeners) {
    listener(memoryState);
  }
};

const removeToast = (toastId: string) => {
  memoryState = {
    toasts: memoryState.toasts.filter((toast) => toast.id !== toastId),
  };
  emit();
};

export const toast = (payload: ToastPayload) => {
  const id = crypto.randomUUID();
  const nextToast: ToastEntry = {
    ...payload,
    id,
    open: true,
    onOpenChange: (open) => {
      if (!open) {
        window.setTimeout(() => removeToast(id), TOAST_REMOVE_DELAY);
      }
    },
  };

  memoryState = {
    toasts: [nextToast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
  };
  emit();

  return {
    id,
    dismiss: () => removeToast(id),
  };
};

export const useToast = () => {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: removeToast,
  };
};
