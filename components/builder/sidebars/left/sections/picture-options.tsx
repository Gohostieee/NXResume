"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip } from "@/components/ui/tooltip";
import { useResumeStore } from "@/stores/resume";

const stringToRatioMap = {
  square: 1,
  portrait: 0.75,
  horizontal: 1.33,
} as const;

const ratioToStringMap = {
  "1": "square",
  "0.75": "portrait",
  "1.33": "horizontal",
} as const;

type AspectRatio = keyof typeof stringToRatioMap;

const stringToBorderRadiusMap = {
  square: 0,
  rounded: 6,
  circle: 9999,
} as const;

const borderRadiusToStringMap = {
  "0": "square",
  "6": "rounded",
  "9999": "circle",
} as const;

type BorderRadius = keyof typeof stringToBorderRadiusMap;

export const PictureOptions = () => {
  const setValue = useResumeStore((state) => state.setValue);
  const picture = useResumeStore((state) => state.resume.data.basics.picture);

  const aspectRatio = useMemo(() => {
    const ratio = picture.aspectRatio.toString() as keyof typeof ratioToStringMap;
    return ratioToStringMap[ratio];
  }, [picture.aspectRatio]);

  const onAspectRatioChange = (value: string) => {
    if (!value) return;
    setValue("basics.picture.aspectRatio", stringToRatioMap[value as AspectRatio]);
  };

  const borderRadius = useMemo(() => {
    const radius = picture.borderRadius.toString() as keyof typeof borderRadiusToStringMap;
    return borderRadiusToStringMap[radius];
  }, [picture.borderRadius]);

  const onBorderRadiusChange = (value: string) => {
    if (!value) return;
    setValue("basics.picture.borderRadius", stringToBorderRadiusMap[value as BorderRadius]);
  };

  return (
    <div className="flex flex-col gap-y-5">
      <div className="grid grid-cols-3 items-center gap-x-4">
        <Label htmlFor="picture.size">Size (px)</Label>
        <Input
          type="number"
          id="picture.size"
          value={picture.size}
          className="col-span-2"
          onChange={(event) => {
            setValue("basics.picture.size", event.target.valueAsNumber);
          }}
        />
      </div>

      <div className="grid grid-cols-3 items-center gap-x-4">
        <Label htmlFor="picture.aspectRatio">Aspect Ratio</Label>
        <div className="col-span-2 flex items-center justify-between">
          <ToggleGroup type="single" value={aspectRatio} onValueChange={onAspectRatioChange}>
            <Tooltip content="Square">
              <ToggleGroupItem value="square">
                <div className="size-3 border border-foreground" />
              </ToggleGroupItem>
            </Tooltip>

            <Tooltip content="Horizontal">
              <ToggleGroupItem value="horizontal">
                <div className="h-2 w-3 border border-foreground" />
              </ToggleGroupItem>
            </Tooltip>

            <Tooltip content="Portrait">
              <ToggleGroupItem value="portrait">
                <div className="h-3 w-2 border border-foreground" />
              </ToggleGroupItem>
            </Tooltip>
          </ToggleGroup>

          <Input
            min={0.1}
            max={2}
            step={0.05}
            type="number"
            className="w-[72px]"
            id="picture.aspectRatio"
            value={picture.aspectRatio}
            onChange={(event) => {
              if (!event.target.valueAsNumber) return;
              if (Number.isNaN(event.target.valueAsNumber)) return;
              setValue("basics.picture.aspectRatio", event.target.valueAsNumber);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 items-center gap-x-4">
        <Label htmlFor="picture.borderRadius">Border Radius</Label>
        <div className="col-span-2 flex items-center justify-between">
          <ToggleGroup type="single" value={borderRadius} onValueChange={onBorderRadiusChange}>
            <Tooltip content="Square">
              <ToggleGroupItem value="square">
                <div className="size-3 border border-foreground" />
              </ToggleGroupItem>
            </Tooltip>

            <Tooltip content="Rounded">
              <ToggleGroupItem value="rounded">
                <div className="size-3 rounded-sm border border-foreground" />
              </ToggleGroupItem>
            </Tooltip>

            <Tooltip content="Circle">
              <ToggleGroupItem value="circle">
                <div className="size-3 rounded-full border border-foreground" />
              </ToggleGroupItem>
            </Tooltip>
          </ToggleGroup>

          <Input
            min={0}
            step={2}
            max={9999}
            type="number"
            className="w-[72px]"
            id="picture.borderRadius"
            value={picture.borderRadius}
            onChange={(event) => {
              setValue("basics.picture.borderRadius", event.target.valueAsNumber);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 items-start gap-x-4">
        <Label>Effects</Label>
        <div className="col-span-2 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="picture.effects.hidden"
              checked={picture.effects.hidden}
              onCheckedChange={(checked) => {
                setValue("basics.picture.effects.hidden", Boolean(checked));
              }}
            />
            <Label htmlFor="picture.effects.hidden">Hidden</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="picture.effects.border"
              checked={picture.effects.border}
              onCheckedChange={(checked) => {
                setValue("basics.picture.effects.border", Boolean(checked));
              }}
            />
            <Label htmlFor="picture.effects.border">Border</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="picture.effects.grayscale"
              checked={picture.effects.grayscale}
              onCheckedChange={(checked) => {
                setValue("basics.picture.effects.grayscale", Boolean(checked));
              }}
            />
            <Label htmlFor="picture.effects.grayscale">Grayscale</Label>
          </div>
        </div>
      </div>
    </div>
  );
};
