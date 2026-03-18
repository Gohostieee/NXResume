import {
  Agent,
  type AgentInputItem,
  OpenAIProvider,
  Runner,
  withTrace,
} from "@openai/agents";
import { defaultResumeData, type ResumeData } from "../schema";
import { resumeEditSchema } from "./resume-edit-schema";
import { DEFAULT_MODEL } from "../../constants/llm";
import { normalizeImportedResume } from "../resume/import";

type ImportResumeFromPdfInput = {
  requestId?: string;
  filename: string;
  pdfBase64: string;
  apiKey: string;
  model?: string | null;
  baseURL?: string | null;
};

const supportsTextVerbosity = (model: string) => /(^|\/)gpt-5([.-]|$)/i.test(model);

const pdfResumeImportInstructions = `You are the NXResume PDF Import Agent.

Your job is to read the uploaded resume PDF and convert it into a single ResumeData JSON object that exactly matches the provided output schema.

Rules:
- Extract facts only from the PDF. Never invent employers, dates, metrics, links, certifications, or education details.
- If a field is missing or unclear, use an empty string, empty array, or set the section visible to false.
- Preserve the baseline metadata structure exactly unless a schema field must be changed to stay valid.
- Keep the original wording whenever possible. Do not rewrite for style or optimization.
- Every item must include an id string, but it does not need to follow a human-readable pattern. Avoid placeholder ids like exp_1 or skill_1.
- For summary-like rich text fields, valid HTML is preferred:
  - paragraph: <p>Text</p>
  - bullets: <ul><li><p>Item</p></li></ul>
- For plain text source content, do not add extra claims or embellishment just to make HTML longer.
- Use sections.summary.content for the professional summary/profile text from the PDF.
- Put social links like LinkedIn, GitHub, portfolio, and personal site into sections.profiles.items when present.
- Use basics.url for the primary personal website only when one is clearly present.
- Leave basics.picture.url empty.
- If the PDF contains no evidence for a section, keep its items empty and visible false.
- Return JSON only. No markdown, commentary, or code fences.`;

const createPdfResumeImportAgent = (model: string) =>
  new Agent({
    name: "PDF Resume Importer",
    instructions: pdfResumeImportInstructions,
    model,
    outputType: resumeEditSchema,
    modelSettings: {
      reasoning: {
        effort: "medium",
      },
      ...(supportsTextVerbosity(model)
        ? {
            text: {
              verbosity: "low" as const,
            },
          }
        : {}),
      store: false,
    },
  });

const createRunner = (apiKey: string, baseURL?: string | null) =>
  new Runner({
    modelProvider: new OpenAIProvider({
      apiKey,
      baseURL: baseURL || undefined,
    }),
  });

const buildPrompt = (filename: string) =>
  [
    "Convert the attached resume PDF into NXResume ResumeData JSON.",
    "Use this baseline metadata and section structure exactly unless content requires a field value change:",
    JSON.stringify(defaultResumeData, null, 2),
    "",
    `PDF filename: ${filename}`,
    "",
    "Return the full ResumeData object only.",
  ].join("\n");

const formatForLog = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const importResumeFromPdf = async ({
  requestId,
  filename,
  pdfBase64,
  apiKey,
  model,
  baseURL,
}: ImportResumeFromPdfInput): Promise<ResumeData> => {
  const resolvedModel = model ?? DEFAULT_MODEL;

  return withTrace("PDF Resume Import", async () => {
    const input: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildPrompt(filename),
          },
          {
            type: "input_file",
            file: `data:application/pdf;base64,${pdfBase64}`,
            filename,
          },
        ],
      },
    ];

    const result = await createRunner(apiKey, baseURL).run(
      createPdfResumeImportAgent(resolvedModel),
      input,
    );

    console.info("[AI][Resume][PDF Import] Runner completed", {
      requestId: requestId ?? null,
      filename,
      model: resolvedModel,
      hasFinalOutput: Boolean(result.finalOutput),
    });

    if (!result.finalOutput) {
      throw new Error("PDF import output is empty");
    }

    console.info("[AI][Resume][PDF Import] Raw AI finalOutput", {
      requestId: requestId ?? null,
      filename,
      finalOutput: formatForLog(result.finalOutput),
    });

    try {
      const agentOutput = resumeEditSchema.parse(result.finalOutput);

      console.info("[AI][Resume][PDF Import] resumeEditSchema.parse succeeded", {
        requestId: requestId ?? null,
        filename,
      });

      const normalizedResume = normalizeImportedResume(agentOutput as ResumeData);

      console.info("[AI][Resume][PDF Import] normalizeImportedResume succeeded", {
        requestId: requestId ?? null,
        filename,
      });

      return normalizedResume;
    } catch (error) {
      console.error("[AI][Resume][PDF Import] Parse pipeline failed", {
        requestId: requestId ?? null,
        filename,
        finalOutput: formatForLog(result.finalOutput),
        error,
      });

      throw error;
    }
  });
};
