import type { ResumeData } from "@reactive-resume/schema";
import type { Schema } from "zod";

export type Parser<Data = unknown, T = unknown, Result = ResumeData> = {
  schema?: Schema;

  readFile(file: File): Promise<Data>;

  validate(data: Data): T | Promise<T>;

  convert(data: T): Result | Promise<Result>;
};
