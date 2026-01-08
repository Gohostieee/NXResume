"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { skillSchema, defaultSkill } from "@/lib/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { BadgeInput } from "@/components/ui/badge-input";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { SectionDialog } from "../sections/section-dialog";

const formSchema = skillSchema;

type FormValues = z.infer<typeof formSchema>;

export const SkillsDialog = () => {
  const form = useForm<FormValues>({
    defaultValues: defaultSkill,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialog<FormValues> id="skills" form={form} defaultValues={defaultSkill}>
      <div className="grid grid-cols-1 gap-4">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="JavaScript, Project Management, etc." />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Brief description of this skill" />
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
              <FormLabel>Skill Level ({field.value}/5)</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={5}
                  step={1}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                />
              </FormControl>
              <FormDescription>
                0 = Hidden, 1 = Beginner, 5 = Expert
              </FormDescription>
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
                  placeholder="Type and press Enter to add keywords..."
                />
              </FormControl>
              <FormDescription>
                Press Enter to add a keyword, click to remove
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SectionDialog>
  );
};
