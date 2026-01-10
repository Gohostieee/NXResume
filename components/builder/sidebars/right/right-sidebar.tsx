"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useResumeStore } from "@/stores/resume";
import { useAutoSaveStore } from "@/stores/auto-save";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { HexColorPicker } from "react-colorful";
import { cn, fonts, localFonts } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { FileJs, FilePdf, SpinnerGap, Copy, Check } from "@phosphor-icons/react";
import { saveAs } from "file-saver";
import { LayoutSection } from "./sections/layout-section";
import { StatisticsSection } from "./sections/statistics-section";
import { InformationSection } from "./sections/information-section";

const TEMPLATES = [
  { value: "azurill", label: "Azurill" },
  { value: "bronzor", label: "Bronzor" },
  { value: "chikorita", label: "Chikorita" },
  { value: "ditto", label: "Ditto" },
  { value: "gengar", label: "Gengar" },
  { value: "glalie", label: "Glalie" },
  { value: "harvard", label: "Harvard" },
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

const MAX_FONT_RESULTS = 200;
const GOOGLE_FONT_WEIGHTS = "400;500;600;700";
const loadedFontFamilies = new Set<string>();

const getFontStack = (family: string) => `"${family}", "IBM Plex Sans", sans-serif`;

const getGoogleFontHref = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${GOOGLE_FONT_WEIGHTS}&display=swap`;

const isLocalFontFamily = (family: string) =>
  localFonts.some((font) => font.toLowerCase() === family.toLowerCase());

const ensureFontLoaded = (family: string) => {
  if (!family || isLocalFontFamily(family)) return;
  if (loadedFontFamilies.has(family)) return;
  if (typeof document === "undefined") return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = getGoogleFontHref(family);
  link.dataset.fontFamily = family;
  document.head.appendChild(link);
  loadedFontFamilies.add(family);
};

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
  const [rawCopied, setRawCopied] = useState(false);
  const currentUser = useQuery(api.users.getCurrentUser);
  const incrementDownloads = useMutation(api.statistics.incrementDownloads);
  const resumeId = resume?.id || resume?._id;

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
      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l">
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
  const username = currentUser?.username;
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const publicUrl = username ? `${origin}/${username}/${resume.slug}` : "";
  const rawJsonUrl = username ? `${origin}/api/resume/public/${username}/${resume.slug}/raw` : "";

  const fontFamily = typography.font?.family || "IBM Plex Serif";
  const [fontOpen, setFontOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState("");
  const fontFamilies = useMemo(() => {
    const families = new Set<string>([...localFonts, ...fonts.map((font) => font.family)]);
    return Array.from(families).sort((a, b) => a.localeCompare(b));
  }, []);
  const fontMatches = useMemo(() => {
    const query = fontQuery.trim().toLowerCase();
    const matches = query
      ? fontFamilies.filter((family) => family.toLowerCase().includes(query))
      : fontFamilies;

    return {
      visible: matches.slice(0, MAX_FONT_RESULTS),
      hasMore: matches.length > MAX_FONT_RESULTS,
    };
  }, [fontQuery, fontFamilies]);

  const fontStack = useMemo(() => getFontStack(fontFamily), [fontFamily]);

  useEffect(() => {
    ensureFontLoaded(fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    if (!fontOpen) return;
    fontMatches.visible.forEach((family) => {
      ensureFontLoaded(family);
    });
  }, [fontOpen, fontMatches.visible]);

  const handleJsonExport = () => {
    const filename = `resume-${resumeId || "export"}.json`;
    const resumeJSON = JSON.stringify(resume.data, null, 2);
    saveAs(new Blob([resumeJSON], { type: "application/json" }), filename);
  };

  const handlePdfExport = async () => {
    setIsPdfLoading(true);
    try {
      if (!resumeId) throw new Error("Missing resume id");
      const response = await fetch(`/api/resume/${resumeId}/print`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      saveAs(blob, `resume-${resumeId}.pdf`);

      if (resume.visibility === "public" && resumeId) {
        incrementDownloads({ resumeId: resumeId as Id<"resumes"> }).catch((error) => {
          console.error("Failed to increment downloads:", error);
        });
      }
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (resume.visibility !== "public" || !publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRawLink = async () => {
    if (resume.visibility !== "public" || !rawJsonUrl) return;
    await navigator.clipboard.writeText(rawJsonUrl);
    setRawCopied(true);
    setTimeout(() => setRawCopied(false), 2000);
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={["template", "layout", "theme", "export"]}>
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

            {/* Layout Section */}
            <AccordionItem value="layout">
              <AccordionTrigger>Layout</AccordionTrigger>
              <AccordionContent>
                <LayoutSection />
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
                    <Popover
                      open={fontOpen}
                      onOpenChange={(open) => {
                        setFontOpen(open);
                        if (open) {
                          setFontQuery("");
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          id="fontFamily"
                          value={fontFamily}
                          readOnly
                          onFocus={() => setFontOpen(true)}
                          onBlur={handleBlur}
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={fontOpen}
                          aria-controls="font-family-list"
                          style={{ fontFamily: fontStack }}
                        />
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[--radix-popover-trigger-width] p-0"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            value={fontQuery}
                            onValueChange={setFontQuery}
                            placeholder="Search fonts..."
                            autoFocus
                          />
                          <CommandList id="font-family-list">
                            {fontMatches.visible.length === 0 && (
                              <CommandEmpty>No fonts found.</CommandEmpty>
                            )}
                            <CommandGroup>
                              {fontMatches.visible.map((family) => (
                                <CommandItem
                                  key={family}
                                  value={family}
                                  onSelect={() => {
                                    setValue("metadata.typography.font.family", family);
                                    setFontOpen(false);
                                    handleBlur();
                                  }}
                                  style={{ fontFamily: getFontStack(family) }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 opacity-0",
                                      family === fontFamily && "opacity-100",
                                    )}
                                  />
                                  {family}
                                </CommandItem>
                              ))}
                              {fontMatches.hasMore && (
                                <CommandItem disabled value="__more-fonts">
                                  Keep typing to narrow results...
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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

                  {resume.visibility === "public" && username && (
                    <div>
                      <Label>Public URL</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-md bg-secondary px-2 py-1 text-xs">
                          {publicUrl.replace(origin, "")}
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

                  {resume.visibility === "public" && username && (
                    <div>
                      <Label>Raw JSON URL</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-md bg-secondary px-2 py-1 text-xs">
                          {rawJsonUrl.replace(origin, "")}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleCopyRawLink}
                        >
                          {rawCopied ? (
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

            {/* Statistics */}
            <AccordionItem value="statistics">
              <AccordionTrigger>Statistics</AccordionTrigger>
              <AccordionContent>
                <StatisticsSection />
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

            {/* Information */}
            <AccordionItem value="information">
              <AccordionTrigger>Information</AccordionTrigger>
              <AccordionContent>
                <InformationSection />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </aside>
  );
}
