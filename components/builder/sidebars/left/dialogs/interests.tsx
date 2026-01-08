"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { interestSchema, defaultInterest } from "@/lib/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BadgeInput } from "@/components/ui/badge-input";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { SectionDialog } from "../sections/section-dialog";

const formSchema = interestSchema;
type FormValues = z.infer<typeof formSchema>;

export const InterestsDialog = () => {
  const form = useForm<FormValues>({
    defaultValues: defaultInterest,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialog<FormValues> id="interests" form={form} defaultValues={defaultInterest}>
      <div className="grid grid-cols-1 gap-4">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Photography, Hiking, etc." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="keywords"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keywords</FormLabel>
              <FormControl>
                <BadgeInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Type and press Enter..."
                />
              </FormControl>
              <FormDescription>
                Related keywords or sub-interests
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SectionDialog>
  );
};
