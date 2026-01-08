"use client";

import { useState } from "react";
import { useResumeStore } from "@/stores/resume";
import { useAutoSaveStore } from "@/stores/auto-save";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { FileJs, FilePdf, SpinnerGap, Copy, Check } from "@phosphor-icons/react";
import { saveAs } from "file-saver";

const TEMPLATES = [
  { value: "azurill", label: "Azurill" },
  { value: "bronzor", label: "Bronzor" },
  { value: "chikorita", label: "Chikorita" },
  { value: "ditto", label: "Ditto" },
  { value: "gengar", label: "Gengar" },
  { value: "glalie", label: "Glalie" },
  { value: "kakuna", label: "Kakuna" },
  { value: "leafish", label: "Leafish" },
  { value: "nosepass", label: "Nosepass" },
  { value: "onyx", label: "Onyx" },
  { value: "pikachu", label: "Pikachu" },
  { value: "rhyhorn", label: "Rhyhorn" },
];

const PAGE_FORMATS = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
];

// Color picker input component with onBlur save
function ColorPickerInput({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Popover onOpenChange={(open) => !open && onBlur()}>
          <PopoverTrigger asChild>
            <div
              className="absolute inset-y-0 left-3 my-2.5 size-4 cursor-pointer rounded-full ring-primary ring-offset-2 ring-offset-background transition-shadow hover:ring-1"
              style={{ backgroundColor: value }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-lg border-none bg-transparent p-0 shadow-lg">
            <HexColorPicker color={value} onChange={onChange} />
          </PopoverContent>
        </Popover>
        <Input
          value={value}
          className="pl-10"
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}

export function RightSidebar() {
  const resume = useResumeStore((state) => state.resume);
  const setValue = useResumeStore((state) => state.setValue);
  const triggerSave = useAutoSaveStore((state) => state.triggerSave);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Save on blur handler
  const handleBlur = () => {
    triggerSave();
  };

  // For selects, switches, sliders - save immediately on change
  const handleImmediateChange = (path: string, value: unknown) => {
    setValue(path, value);
    triggerSave();
  };

  if (!resume?.data) {
    return (
      <aside className="w-72 overflow-hidden border-l">
        <div className="flex h-full items-center justify-center">
          <div className="text-foreground/60">Loading...</div>
        </div>
      </aside>
    );
  }

  const metadata = resume.data.metadata;
  const template = metadata?.template || "rhyhorn";
  const pageFormat = metadata?.page?.format || "a4";
  const pageMargin = metadata?.page?.margin || 18;
  const pageNumbers = metadata?.page?.options?.pageNumbers ?? true;
  const breakLine = metadata?.page?.options?.breakLine ?? false;
  const theme = metadata?.theme || { background: "#ffffff", text: "#000000", primary: "#dc2626" };
  const typography = metadata?.typography || { font: { family: "IBM Plex Serif", size: 14 }, lineHeight: 1.5 };
  const css = metadata?.css || { value: "", visible: false };
  const notes = metadata?.notes || "";

  const handleJsonExport = () => {
    const filename = `resume-${resume.id}.json`;
    const resumeJSON = JSON.stringify(resume.data, null, 2);
    saveAs(new Blob([resumeJSON], { type: "application/json" }), filename);
  };

  const handlePdfExport = async () => {
    setIsPdfLoading(true);
    try {
      const response = await fetch(`/api/resume/${resume.id}/print`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      saveAs(blob, `resume-${resume.id}.pdf`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (resume.visibility === "public") {
      const url = `${window.location.origin}/${resume.userId}/${resume.slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <aside className="flex w-72 flex-col overflow-hidden border-l">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={["template", "theme", "export"]}>
            {/* Template Section */}
            <AccordionItem value="template">
              <AccordionTrigger>Template</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template">Choose Template</Label>
                    <Select
                      value={template}
                      onValueChange={(value) => handleImmediateChange("metadata.template", value)}
                    >
                      <SelectTrigger id="template">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Theme Section */}
            <AccordionItem value="theme">
              <AccordionTrigger>Theme</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {/* Quick color palette */}
                  <div>
                    <Label className="mb-2 block">Quick Colors</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map((color) => (
                        <div
                          key={color}
                          className={cn(
                            "flex size-7 cursor-pointer items-center justify-center rounded-full ring-primary ring-offset-1 ring-offset-background transition-shadow hover:ring-2",
                            theme.primary === color && "ring-2",
                          )}
                          onClick={() => handleImmediateChange("metadata.theme.primary", color)}
                        >
                          <div
                            className="size-5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color pickers */}
                  <ColorPickerInput
                    label="Primary Color"
                    value={theme.primary}
                    onChange={(color) => setValue("metadata.theme.primary", color)}
                    onBlur={handleBlur}
                  />

                  <ColorPickerInput
                    label="Background Color"
                    value={theme.background}
                    onChange={(color) => setValue("metadata.theme.background", color)}
                    onBlur={handleBlur}
                  />

                  <ColorPickerInput
                    label="Text Color"
                    value={theme.text}
                    onChange={(color) => setValue("metadata.theme.text", color)}
                    onBlur={handleBlur}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Page Settings */}
            <AccordionItem value="page">
              <AccordionTrigger>Page Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pageFormat">Page Format</Label>
                    <Select
                      value={pageFormat}
                      onValueChange={(value) => handleImmediateChange("metadata.page.format", value)}
                    >
                      <SelectTrigger id="pageFormat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Page Margin ({pageMargin}px)</Label>
                    <Slider
                      value={[pageMargin]}
                      min={0}
                      max={48}
                      step={2}
                      onValueChange={([value]) => setValue("metadata.page.margin", value)}
                      onValueCommit={() => handleBlur()}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="pageNumbers">Page Numbers</Label>
                    <Switch
                      id="pageNumbers"
                      checked={pageNumbers}
                      onCheckedChange={(checked) =>
                        handleImmediateChange("metadata.page.options.pageNumbers", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="breakLine">Break Line</Label>
                    <Switch
                      id="breakLine"
                      checked={breakLine}
                      onCheckedChange={(checked) =>
                        handleImmediateChange("metadata.page.options.breakLine", checked)
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Typography */}
            <AccordionItem value="typography">
              <AccordionTrigger>Typography</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Input
                      id="fontFamily"
                      value={typography.font?.family || "IBM Plex Serif"}
                      onChange={(e) =>
                        setValue("metadata.typography.font.family", e.target.value)
                      }
                      onBlur={handleBlur}
                    />
                  </div>

                  <div>
                    <Label>Font Size ({typography.font?.size || 14}px)</Label>
                    <Slider
                      value={[typography.font?.size || 14]}
                      min={10}
                      max={20}
                      step={1}
                      onValueChange={([value]) => setValue("metadata.typography.font.size", value)}
                      onValueCommit={() => handleBlur()}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Line Height ({typography.lineHeight || 1.5})</Label>
                    <Slider
                      value={[typography.lineHeight || 1.5]}
                      min={1}
                      max={2.5}
                      step={0.1}
                      onValueChange={([value]) => setValue("metadata.typography.lineHeight", value)}
                      onValueCommit={() => handleBlur()}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="hideIcons">Hide Icons</Label>
                    <Switch
                      id="hideIcons"
                      checked={typography.hideIcons || false}
                      onCheckedChange={(checked) =>
                        handleImmediateChange("metadata.typography.hideIcons", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="underlineLinks">Underline Links</Label>
                    <Switch
                      id="underlineLinks"
                      checked={typography.underlineLinks ?? true}
                      onCheckedChange={(checked) =>
                        handleImmediateChange("metadata.typography.underlineLinks", checked)
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Custom CSS */}
            <AccordionItem value="css">
              <AccordionTrigger>Custom CSS</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cssVisible">Enable Custom CSS</Label>
                    <Switch
                      id="cssVisible"
                      checked={css.visible}
                      onCheckedChange={(checked) =>
                        handleImmediateChange("metadata.css.visible", checked)
                      }
                    />
                  </div>

                  {css.visible && (
                    <Textarea
                      value={css.value}
                      onChange={(e) => setValue("metadata.css.value", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="/* Add your custom CSS here */"
                      rows={8}
                      className="font-mono text-xs"
                    />
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Notes */}
            <AccordionItem value="notes">
              <AccordionTrigger>Notes</AccordionTrigger>
              <AccordionContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setValue("metadata.notes", e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Add private notes about this resume..."
                  rows={4}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Notes are private and won't appear on your resume.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Visibility */}
            <AccordionItem value="visibility">
              <AccordionTrigger>Sharing</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <Label>Resume Visibility</Label>
                    <Select
                      value={resume.visibility}
                      onValueChange={(value) => handleImmediateChange("visibility", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resume.visibility === "public"
                        ? "Anyone with the link can view this resume"
                        : "Only you can view this resume"}
                    </p>
                  </div>

                  {resume.visibility === "public" && (
                    <div>
                      <Label>Public URL</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-md bg-secondary px-2 py-1 text-xs">
                          /{resume.userId}/{resume.slug}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleCopyLink}
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Export Section */}
            <AccordionItem value="export">
              <AccordionTrigger>Export</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={handleJsonExport}
                  >
                    <FileJs className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-muted-foreground">
                        Download resume data
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={handlePdfExport}
                    disabled={isPdfLoading}
                  >
                    {isPdfLoading ? (
                      <SpinnerGap className="h-5 w-5 animate-spin" />
                    ) : (
                      <FilePdf className="h-5 w-5" />
                    )}
                    <div className="text-left">
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-muted-foreground">
                        Download printable PDF
                      </div>
                    </div>
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </aside>
  );
}
