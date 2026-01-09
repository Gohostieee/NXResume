"use client";

import { ArrowCounterClockwise, Broom, Columns, Eye, EyeSlash, List, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import type { SectionKey, SectionWithItem } from "@/lib/schema";
import { defaultSections } from "@/lib/schema";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import get from "lodash.get";
import { useMemo } from "react";

import { useDialog } from "@/stores/dialog";
import { useResumeStore } from "@/stores/resume";

type Props = { id: SectionKey };

export const SectionOptions = ({ id }: Props) => {
  const { open } = useDialog(id);

  const setValue = useResumeStore((state) => state.setValue);
  const removeSection = useResumeStore((state) => state.removeSection);

  const section = useResumeStore((state) => get(state.resume?.data?.sections, id)) as SectionWithItem | undefined;
  const originalName = get(defaultSections, `${id}.name`, section?.name || "") as string;

  const hasItems = useMemo(() => section && "items" in section, [section]);
  const isCustomSection = useMemo(() => id.startsWith("custom."), [id]);

  if (!section) return null;

  const onCreate = () => {
    open("create", { id });
  };

  const toggleSeparateLinks = (checked: boolean) => {
    setValue(`sections.${id}.separateLinks`, checked);
  };

  const toggleVisibility = () => {
    setValue(`sections.${id}.visible`, !section.visible);
  };

  const onResetName = () => {
    if (!originalName) return;
    setValue(`sections.${id}.name`, originalName);
  };

  const onChangeColumns = (value: string) => {
    setValue(`sections.${id}.columns`, Number(value));
  };

  const onResetItems = () => {
    if (!hasItems) return;
    setValue(`sections.${id}.items`, []);
  };

  const onRemove = () => {
    if (!isCustomSection) return;
    removeSection(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Section options">
          <List className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {hasItems && (
          <>
            <DropdownMenuItem onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add a new item
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem checked={section.separateLinks} onCheckedChange={toggleSeparateLinks}>
              Separate links
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={toggleVisibility}>
            {section.visible ? <Eye className="mr-2 h-4 w-4" /> : <EyeSlash className="mr-2 h-4 w-4" />}
            {section.visible ? "Hide" : "Show"}
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PencilSimple className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <div className="relative">
                <Input
                  id={`sections.${id}.name`}
                  value={section.name}
                  onChange={(event) => {
                    setValue(`sections.${id}.name`, event.target.value);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute inset-y-0 right-0"
                  onClick={onResetName}
                >
                  <ArrowCounterClockwise className="h-4 w-4" />
                </Button>
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Columns className="mr-2 h-4 w-4" />
              Columns
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={`${section.columns}`} onValueChange={onChangeColumns}>
                {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
                  <DropdownMenuRadioItem key={value} value={`${value}`}>
                    {value} {value === 1 ? "Column" : "Columns"}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={!hasItems} onClick={onResetItems}>
          <Broom className="mr-2 h-4 w-4" />
          Reset
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={!isCustomSection}
          onClick={onRemove}
        >
          <Trash className="mr-2 h-4 w-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
