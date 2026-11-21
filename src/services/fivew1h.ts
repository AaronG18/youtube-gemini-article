import { z } from "zod";

export const fiveW1HSchema = z.object({
  who: z.string(),
  what: z.string(),
  when: z.string(),
  where: z.string(),
  why: z.string(),
  how: z.string(),
});

export interface FiveW1H extends z.infer<typeof fiveW1HSchema> {}

export interface FiveW1HOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/** Build a prompt that uses the whole article plus one chapter as context. */
export const buildFiveW1HPrompt = (article: string, chapterTitle: string): string =>
  [
    "You summarize one chapter of a Chinese article.",
    "Use the whole article for context but only summarize this chapter: " + chapterTitle,
    "Return strict JSON with keys who, what, when, where, why, how; each value is a Chinese sentence.",
    "Article:",
    article,
  ].join("\n");

const unwrapJson = (text: string): string =>
  text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

/** Ask Gemini for a structured 5W1H summary of one chapter. */
export const generateFiveW1H = async (
  article: string,
  chapterTitle: string,
  options: FiveW1HOptions,
): Promise<FiveW1H> => {
  if (!options.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on this Worker");
  }
  const model = options.model ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`;
  const requestFetch = options.fetchImpl ?? fetch;
  const response = await requestFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: buildFiveW1HPrompt(article, chapterTitle) }] },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini summary failed with ${response.status}`);
  }
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return fiveW1HSchema.parse(JSON.parse(unwrapJson(text)));
};
