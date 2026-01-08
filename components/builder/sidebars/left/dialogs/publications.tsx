"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { publicationSchema, defaultPublication } from "@/lib/schema";
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

const formSchema = publicationSchema;
type FormValues = z.infer<typeof formSchema>;

export const PublicationsDialog = () => {
  const form = useForm<FormValues>({
    defaultValues: defaultPublication,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialog<FormValues> id="publications" form={form} defaultValues={defaultPublication}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Machine Learning in Practice" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="publisher"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Publisher</FormLabel>
              <FormControl>
                <Input {...field} placeholder="IEEE, ACM, Medium, etc." />
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
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input {...field} placeholder="June 2023" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="url.href"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://doi.org/..." />
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
                <Textarea
                  {...field}
                  placeholder="Brief description of the publication..."
                  rows={4}
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
