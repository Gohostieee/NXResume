"use client";

import { Tag } from "@phosphor-icons/react";
import type { URL } from "@/lib/schema";
import { urlSchema } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { forwardRef, useMemo } from "react";

type Props = {
  id?: string;
  value: URL;
  placeholder?: string;
  onChange: (value: URL) => void;
};

export const URLInput = forwardRef<HTMLInputElement, Props>(
  ({ id, value, placeholder, onChange }, ref) => {
    const hasError = useMemo(() => !urlSchema.safeParse(value).success, [value]);

    return (
      <div className="space-y-1.5">
        <div className="flex gap-x-2">
          <Input
            ref={ref}
            id={id}
            value={value.href}
            className="flex-1"
            placeholder={placeholder}
            onChange={(event) => {
              onChange({ ...value, href: event.target.value });
            }}
          />

          <Popover>
            <Tooltip content="Label">
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Tag className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </Tooltip>
            <PopoverContent className="p-2">
              <Input
                value={value.label}
                placeholder="Label"
                onChange={(event) => {
                  onChange({ ...value, label: event.target.value });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {hasError && (
          <p className="text-xs text-muted-foreground">URL must start with https://</p>
        )}
      </div>
    );
  },
);

URLInput.displayName = "URLInput";
