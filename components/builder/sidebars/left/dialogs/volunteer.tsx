"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { volunteerSchema, defaultVolunteer } from "@/lib/schema";
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

const formSchema = volunteerSchema;
type FormValues = z.infer<typeof formSchema>;

export const VolunteerDialog = () => {
  const form = useForm<FormValues>({
    defaultValues: defaultVolunteer,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialog<FormValues> id="volunteer" form={form} defaultValues={defaultVolunteer}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          name="organization"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Red Cross" />
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
                <Input {...field} placeholder="Volunteer Coordinator" />
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
                <Input {...field} placeholder="2020 - Present" />
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
                <Input {...field} placeholder="New York, NY" />
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
                <Input {...field} placeholder="https://organization.org" />
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
                  placeholder="Describe your volunteer work, responsibilities, and impact..."
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
