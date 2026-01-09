"use client";

import { CaretRight } from "@phosphor-icons/react";
import { basicsSchema } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/stores/resume";
import { PictureSection } from "./picture-section";
import { CustomFieldsSection } from "./custom-fields-section";
import { URLInput } from "./url-input";

export const BasicsSection = () => {
  const setValue = useResumeStore((state) => state.setValue);
  const basics = useResumeStore((state) => state.resume.data.basics);

  const collapsed = useResumeStore((state) => state.collapsedSections.basics ?? false);
  const toggleCollapseSection = useResumeStore((state) => state.toggleCollapseSection);

  return (
    <section id="basics" className="space-y-4">
      <header className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
          onClick={() => {
            toggleCollapseSection("basics");
          }}
        >
          <CaretRight className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-90")} />
        </Button>
        <h3 className="font-semibold">Basics</h3>
      </header>

      {!collapsed && (
        <div className="space-y-4">
          <PictureSection />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="basics.name">Full Name</Label>
              <Input
                id="basics.name"
                value={basics?.name || ""}
                onChange={(event) => setValue("basics.name", event.target.value)}
                aria-invalid={!basicsSchema.pick({ name: true }).safeParse({ name: basics?.name || "" }).success}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="basics.headline">Headline</Label>
              <Input
                id="basics.headline"
                value={basics?.headline || ""}
                onChange={(event) => setValue("basics.headline", event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="basics.email">Email</Label>
              <Input
                id="basics.email"
                type="email"
                value={basics?.email || ""}
                onChange={(event) => setValue("basics.email", event.target.value)}
                aria-invalid={!basicsSchema.pick({ email: true }).safeParse({ email: basics?.email || "" }).success}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="basics.phone">Phone</Label>
              <Input
                id="basics.phone"
                value={basics?.phone || ""}
                onChange={(event) => setValue("basics.phone", event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="basics.location">Location</Label>
              <Input
                id="basics.location"
                value={basics?.location || ""}
                onChange={(event) => setValue("basics.location", event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="basics.url">Website</Label>
              <URLInput
                id="basics.url"
                value={basics?.url || { label: "", href: "" }}
                placeholder="https://example.com"
                onChange={(value) => setValue("basics.url", value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Custom Fields</Label>
            <CustomFieldsSection className="mt-2" />
          </div>
        </div>
      )}
    </section>
  );
};
