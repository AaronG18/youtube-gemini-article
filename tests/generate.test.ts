import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { buildArticlePrompt, streamArticle } from "../src/services/gemini";
import { DEMO_TRANSCRIPT } from "../src/services/transcript";

const DEMO_URL = "https://www.youtube.com/watch?v=xRh2sVcNXQ8";

const sseResponse = (chunks: readonly string[]): Response => {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const text of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`),
        );
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
};

afterEach(() => vi.unstubAllGlobals());

describe("Gemini service", () => {
  it("builds a prompt with the transcript and Chinese instructions", () => {
    const prompt = buildArticlePrompt(DEMO_TRANSCRIPT);
    expect(prompt).toContain("Chinese");
    expect(prompt).toContain(DEMO_TRANSCRIPT.segments[0].text);
  });

  it("yields text chunks from an SSE stream", async () => {
    const fetchMock = vi.fn(async (_url: string) => sseResponse(["Hello", " world"]));
    const chunks: string[] = [];
    for await (const chunk of streamArticle(DEMO_TRANSCRIPT, {
      apiKey: "test",
      fetchImpl: fetchMock as unknown as typeof fetch,
    })) {
      chunks.push(chunk);
    }
    expect(chunks.join("")).toBe("Hello world");
    expect(fetchMock.mock.calls[0][0]).toContain("streamGenerateContent");
  });
});

describe("generate API", () => {
  it("returns 503 when the API key is missing", async () => {
    const response = await app.request(
      "/api/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: DEMO_URL }),
      },
      {},
    );
    expect(response.status).toBe(503);
  });

  it("streams SSE deltas for a configured worker", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string) => sseResponse(["流式", "输出"])));
    const response = await app.request(
      "/api/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: DEMO_URL }),
      },
      { GEMINI_API_KEY: "test" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const text = await response.text();
    expect(text).toContain('"delta":"流式"');
    expect(text).toContain('"done":true');
  });

  it("rejects a missing url with 400", async () => {
    const response = await app.request("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });
});
