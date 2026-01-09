"use client";

import { useMemo, useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { Aperture, Trash, UploadSimple } from "@phosphor-icons/react";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/stores/resume";
import { PictureOptions } from "./picture-options";

const urlSchema = z.string().url();

export const PictureSection = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const [isUploading, setIsUploading] = useState(false);

  const setValue = useResumeStore((state) => state.setValue);
  const picture = useResumeStore((state) => state.resume.data.basics.picture);

  const isValidUrl = useMemo(() => urlSchema.safeParse(picture.url).success, [picture.url]);

  const onSelectImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    try {
      setIsUploading(true);
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await response.json()) as { storageId: string };
      const url = await convex.query(api.storage.getFileUrl, { storageId: storageId as Id<"_storage"> });

      if (url) {
        setValue("basics.picture.url", url);
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onAvatarClick = () => {
    if (isValidUrl) {
      setValue("basics.picture.url", "");
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className="flex items-center gap-x-4">
      <div className="group relative cursor-pointer" onClick={onAvatarClick}>
        <Avatar className="size-14 bg-secondary">
          <AvatarImage src={picture.url} />
        </Avatar>

        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-background/40 opacity-0 transition-opacity group-hover:opacity-100",
            isUploading && "opacity-100",
          )}
        >
          {isValidUrl ? <Trash className="h-4 w-4" /> : <UploadSimple className="h-4 w-4" />}
        </div>
      </div>

      <div className="flex w-full flex-col gap-y-1.5">
        <Label htmlFor="basics.picture.url">Picture</Label>
        <div className="flex items-center gap-x-2">
          <input ref={inputRef} hidden type="file" accept="image/*" onChange={onSelectImage} />

          <Input
            id="basics.picture.url"
            placeholder="https://..."
            value={picture.url}
            onChange={(event) => {
              setValue("basics.picture.url", event.target.value);
            }}
          />

          {isValidUrl && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" type="button" disabled={isUploading}>
                  <Aperture className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]">
                <PictureOptions />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
};
