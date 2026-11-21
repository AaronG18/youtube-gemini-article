import type { Constraints } from "./constraints";
import { formatConstraints } from "./constraints";
import type { Transcript } from "./transcript";

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiEvent {
  candidates?: GeminiCandidate[];
}

export interface GeminiStreamOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
  constraints?: Constraints;
}

export class GeminiUnavailableError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured on this Worker");
    this.name = "GeminiUnavailableError";
  }
}

/** Build the system prompt used for the main article. */
export const buildArticlePrompt = (
  transcript: Transcript,
  constraints?: Constraints,
): string => {
  const lines = transcript.segments
    .map((segment) => `- ${segment.text}`)
    .join("\n");
  return [
    "You are a meticulous Chinese technical editor.",
    "Write a readable Chinese article based on the transcript below.",
    "Organize it into chapters with <h2> headings; use <p> for prose and <blockquote> for dialogue.",
    "Keep facts within what the transcript supports. Do not invent numbers.",
    "Return only HTML fragments, without a leading title or code fence.",
    ...(constraints ? ["User constraints:", formatConstraints(constraints)] : []),
    "Transcript:",
    lines,
  ].join("\n");
};

const extractText = (line: string): string | null => {
  if (!line.startsWith("data: ")) {
    return null;
  }
  const payload = line.slice(6).trim();
  if (!payload || payload === "[DONE]") {
    return null;
  }
  const event = JSON.parse(payload) as GeminiEvent;
  const parts = event.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("");
};

/** Yield text chunks from Gemini's SSE stream as they arrive. */
export const streamArticle = async function* (
  transcript: Transcript,
  options: GeminiStreamOptions,
): AsyncGenerator<string> {
  if (!options.apiKey) {
    throw new GeminiUnavailableError();
  }
  const model = options.model ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(options.apiKey)}`;
  const requestFetch = options.fetchImpl ?? fetch;
  const response = await requestFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: buildArticlePrompt(transcript, options.constraints) }] },
      ],
      generationConfig: { temperature: 0.7 },
    }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Gemini stream failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      for (const line of event.split("\n")) {
        const text = extractText(line);
        if (text) {
          yield text;
        }
      }
    }
  }
};
