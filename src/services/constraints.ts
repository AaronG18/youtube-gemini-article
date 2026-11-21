import { z } from "zod";

export const constraintsSchema = z.object({
  taskType: z.string(),
  style: z.string(),
  audience: z.string(),
  constraints: z.array(z.string()),
  include5w1h: z.boolean(),
});

export interface Constraints extends z.infer<typeof constraintsSchema> {}

/** Map free-form Chinese or English requirements into prompt constraints. */
export const parseConstraints = (input: string): Constraints => {
  const text = input.trim();
  if (!text) {
    return {
      taskType: "article",
      style: "conversational",
      audience: "general readers",
      constraints: [],
      include5w1h: true,
    };
  }

  const taskType = /总结|摘要|summary/i.test(text)
    ? "summary"
    : /分析|analysis/i.test(text)
      ? "analysis"
      : "article";
  const style = /幽默|humorous/i.test(text)
    ? "humorous"
    : /正式|formal/i.test(text)
      ? "formal"
      : "conversational";
  const audience = /开发|工程|developer|engineer/i.test(text)
    ? "developers"
    : /学生|student/i.test(text)
      ? "students"
      : "general readers";

  const constraints: string[] = [];
  if (/不要|禁止|不得|avoid/i.test(text)) {
    constraints.push("Honor every explicit prohibition in the request");
  }
  if (/长度|字数|words|分钟/i.test(text)) {
    constraints.push("Respect the requested length");
  }
  if (/5w1h|六何/i.test(text)) {
    constraints.push("Keep chapters suitable for 5W1H summaries");
  }

  return { taskType, style, audience, constraints, include5w1h: true };
};

/** Render constraints as prompt lines; used by both article and summary services. */
export const formatConstraints = (constraints: Constraints): string =>
  [
    `Task type: ${constraints.taskType}`,
    `Output style: ${constraints.style}`,
    `Target audience: ${constraints.audience}`,
    ...constraints.constraints.map((item) => `- ${item}`),
  ].join("\n");
