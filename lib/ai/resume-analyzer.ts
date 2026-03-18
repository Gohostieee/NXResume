import { Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";
import { DEFAULT_MODEL } from "../../constants/llm";

const MAX_GUIDED_QUESTIONS = 10;

const MyAgentSchema = z.object({
  issues: z.array(
    z.object({
      reasoning: z.string(),
      question: z.string(),
    }),
  ),
});

const createAnalyzerAgent = (model: string) =>
  new Agent({
    name: "My agent",
    instructions: `You analyze a user's resume, job description, company information, and requested change, then decide whether any clarification questions are truly necessary before an AI rewrite.

Your standard is strict. Ask only high-signal questions.

Ask a question only when the answer would:
- materially change the final resume output,
- prevent the resume rewrite from inventing or guessing facts, or
- resolve a blocking ambiguity in the user's request, background, or job fit.

Do not ask questions when:
- the answer is already present in the resume, career profile, application context, or company info,
- the question is generic, speculative, or nice to have,
- the rewrite can proceed safely with the existing information,
- the question only seeks optional optimization rather than required clarification,
- multiple small questions can be merged into one more precise question.

Prioritize like plan mode:
1. Find only the highest-impact unknowns.
2. Prefer fewer questions over exhaustive coverage.
3. Merge overlapping gaps into one question when possible.
4. Rank issues from most important to least important.
5. Return zero questions if nothing important is missing.

Focus on:
- factual gaps that would block a truthful rewrite,
- resume/job mismatches that can only be addressed if the user provides more real information,
- missing dates, scope, metrics, tools, domain context, or achievements only when those details are necessary to make the requested change well,
- ambiguities introduced by the user's prompt that materially affect what should be rewritten.

Question writing rules:
- Keep each question concise, specific, and directly answerable.
- Ask about one decision or tightly related cluster of facts.
- Do not ask the user to validate things already stated in the provided context.
- Do not ask brainstorming questions.
- Do not ask for preferences unless they materially change the output.

Output requirements:
- Return JSON only.
- Use this exact shape:
{
  "issues": [
    {
      "reasoning": "brief explanation of why this missing information matters",
      "question": "clear, concise follow-up question"
    }
  ]
}
- Return at most ${MAX_GUIDED_QUESTIONS} issues.
- If fewer than ${MAX_GUIDED_QUESTIONS} questions are warranted, return fewer.
- If no meaningful clarification is needed, return { "issues": [] }.`,
    model,
    outputType: MyAgentSchema,
    modelSettings: {
      reasoning: {
        effort: "high",
      },
      store: true,
    },
  });

const approvalRequest = (message: string) => {
  void message;

  // TODO: Implement
  return true;
};

type WorkflowInput = {
  input_as_text: string;
  model?: string | null;
};

export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Resume Analyzer", async () => {
    const agent = createAnalyzerAgent(workflow.model ?? DEFAULT_MODEL);
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_69aa01d8c0c081909a36c91859bf75c5022d00d79edbc53c",
      },
    });

    const myAgentResultTemp = await runner.run(agent, [...conversationHistory]);
    conversationHistory.push(
      ...myAgentResultTemp.newItems.map((item) => item.rawItem as AgentInputItem),
    );

    if (!myAgentResultTemp.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    const myAgentResult = {
      output_text: JSON.stringify(myAgentResultTemp.finalOutput),
      output_parsed: myAgentResultTemp.finalOutput,
    };

    return myAgentResult.output_parsed;
  });
};
