import { parseConstraints } from "../../services/constraints";
import { GeminiUnavailableError, streamArticle } from "../../services/gemini";
import { saveSession } from "../../services/session";
import {
  getTranscript,
  InvalidYouTubeUrlError,
  TranscriptUnavailableError,
} from "../../services/transcript";
import type { AppContext } from "../../types";
import { extractChapters } from "../../utils/html";

const sse = (payload: object): Uint8Array =>
  new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);

/** Stream a Chinese article and persist the context for chapter summaries. */
export const handleGenerate = async (
  c: AppContext,
  url: string,
  requirements: string,
) => {
  try {
    const { transcript } = await getTranscript(url, {
      transcriptEndpoint: c.env?.TRANSCRIPT_ENDPOINT,
    });
    const apiKey = c.env?.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiUnavailableError();
    }
    const constraints = parseConstraints(requirements);
    const sessionId = crypto.randomUUID();

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let article = "";
        try {
          for await (const delta of streamArticle(transcript, { apiKey, constraints })) {
            article += delta;
            controller.enqueue(sse({ delta }));
          }
          await saveSession(c.env?.ARTICLE_CONTEXT, {
            id: sessionId,
            transcript,
            article,
            constraints,
            chapters: extractChapters(article),
            createdAt: Date.now(),
          });
          controller.enqueue(sse({ done: true, sessionId }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Generation failed";
          controller.enqueue(sse({ error: message }));
        }
        controller.close();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-Session-Id": sessionId,
      },
    });
  } catch (error) {
    if (error instanceof InvalidYouTubeUrlError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof TranscriptUnavailableError) {
      return c.json({ error: error.message }, 502);
    }
    if (error instanceof GeminiUnavailableError) {
      return c.json({ error: error.message }, 503);
    }
    throw error;
  }
};
