"use client";

import { createId } from "@paralleldrive/cuid2";
import { DotsSixVertical, Envelope, Plus, X } from "@phosphor-icons/react";
import type { CustomField } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Reorder, useDragControls } from "framer-motion";
import { useResumeStore } from "@/stores/resume";

type CustomFieldProps = {
  field: CustomField;
  onChange: (field: CustomField) => void;
  onRemove: (id: string) => void;
};

const CustomFieldRow = ({ field, onChange, onRemove }: CustomFieldProps) => {
  const controls = useDragControls();

  const handleChange = (key: "icon" | "name" | "value", value: string) => {
    onChange({ ...field, [key]: value });
  };

  return (
    <Reorder.Item value={field} dragListener={false} dragControls={controls} className="space-y-2">
      <div className="flex items-end gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 cursor-grab"
          onPointerDown={(event) => {
            controls.start(event);
          }}
        >
          <DotsSixVertical className="h-4 w-4" />
        </Button>

        <Popover>
          <Tooltip content="Icon">
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="shrink-0">
                {field.icon ? (
                  <i className={cn(`ph ph-bold ph-${field.icon}`)} />
                ) : (
                  <Envelope className="h-4 w-4" />
                )}
              </Button>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent side="bottom" align="start" className="flex flex-col gap-y-2 p-2">
            <Input
              value={field.icon}
              placeholder="Enter Phosphor icon"
              onChange={(event) => {
                onChange({ ...field, icon: event.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Use Phosphor icon names (e.g. <code>envelope</code>).
            </p>
          </PopoverContent>
        </Popover>

        <Input
          className="flex-1"
          placeholder="Name"
          value={field.name}
          onChange={(event) => {
            handleChange("name", event.target.value);
          }}
        />

        <Input
          className="flex-1"
          placeholder="Value"
          value={field.value}
          onChange={(event) => {
            handleChange("value", event.target.value);
          }}
        />

        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={() => {
            onRemove(field.id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Reorder.Item>
  );
};

type Props = {
  className?: string;
};

export const CustomFieldsSection = ({ className }: Props) => {
  const setValue = useResumeStore((state) => state.setValue);
  const customFields = useResumeStore((state) => state.resume.data.basics.customFields);

  const onAddCustomField = () => {
    setValue("basics.customFields", [
      ...customFields,
      { id: createId(), icon: "envelope", name: "", value: "" },
    ]);
  };

  const onChangeCustomField = (field: CustomField) => {
    const index = customFields.findIndex((item) => item.id === field.id);
    if (index === -1) return;

    const next = [...customFields];
    next[index] = field;
    setValue("basics.customFields", next);
  };

  const onReorderCustomFields = (values: CustomField[]) => {
    setValue("basics.customFields", values);
  };

  const onRemoveCustomField = (id: string) => {
    setValue(
      "basics.customFields",
      customFields.filter((field) => field.id !== id),
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Reorder.Group axis="y" className="space-y-3" values={customFields} onReorder={onReorderCustomFields}>
        {customFields.map((field) => (
          <CustomFieldRow
            key={field.id}
            field={field}
            onChange={onChangeCustomField}
            onRemove={onRemoveCustomField}
          />
        ))}
      </Reorder.Group>

      <Button variant="link" size="sm" onClick={onAddCustomField}>
        <Plus className="mr-2 h-4 w-4" />
        Add a custom field
      </Button>
    </div>
  );
};
