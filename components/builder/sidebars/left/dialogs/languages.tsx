"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { languageSchema, defaultLanguage } from "@/lib/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { SectionDialog } from "../sections/section-dialog";

const formSchema = languageSchema;
type FormValues = z.infer<typeof formSchema>;

export const LanguagesDialog = () => {
  const form = useForm<FormValues>({
    defaultValues: defaultLanguage,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialog<FormValues> id="languages" form={form} defaultValues={defaultLanguage}>
      <div className="grid grid-cols-1 gap-4">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Language</FormLabel>
              <FormControl>
                <Input {...field} placeholder="English, Spanish, etc." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fluency Level</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Native, Fluent, Intermediate, Basic" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="level"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Level ({field.value}/5)</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={5}
                  step={1}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SectionDialog>
  );
};
