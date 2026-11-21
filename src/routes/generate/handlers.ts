import { GeminiUnavailableError, streamArticle } from "../../services/gemini";
import {
  getTranscript,
  InvalidYouTubeUrlError,
  TranscriptUnavailableError,
} from "../../services/transcript";
import type { AppContext } from "../../types";

const sse = (payload: object): Uint8Array =>
  new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);

/** Stream a Chinese article as server-sent events. */
export const handleGenerate = async (c: AppContext, url: string) => {
  try {
    const { transcript } = await getTranscript(url, {
      transcriptEndpoint: c.env?.TRANSCRIPT_ENDPOINT,
    });
    const apiKey = c.env?.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiUnavailableError();
    }

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const delta of streamArticle(transcript, { apiKey })) {
            controller.enqueue(sse({ delta }));
          }
          controller.enqueue(sse({ done: true }));
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
