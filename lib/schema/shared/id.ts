import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const cuid2Schema = z.string().cuid2();

export const createDefaultId = () => createId();

export const isCuid2Id = (value: unknown): value is string =>
  cuid2Schema.safeParse(value).success;

export const idSchema = z
  .preprocess((value) => value ?? createDefaultId(), cuid2Schema)
  .describe("Unique identifier for the item in Cuid2 format");
