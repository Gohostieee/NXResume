"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { experienceSchema, defaultExperience } from "@/lib/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichInput } from "@/components/ui/rich-input";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { SectionDialog } from "../sections/section-dialog";

const formSchema = experienceSchema;

type FormValues = z.infer<typeof formSchema>;

export const ExperienceDialog = () => {
  const form = useForm<FormValues>({
    defaultValues: defaultExperience,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialog<FormValues> id="experience" form={form} defaultValues={defaultExperience}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          name="company"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Acme Inc." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="position"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Software Engineer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="date"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date or Date Range</FormLabel>
              <FormControl>
                <Input {...field} placeholder="March 2023 - Present" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="location"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="San Francisco, CA" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="url.href"
          control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://company.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="summary"
          control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <RichInput
                  content={field.value}
                  onChange={field.onChange}
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
