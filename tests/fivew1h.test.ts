import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { formatConstraints, parseConstraints } from "../src/services/constraints";
import {
  buildFiveW1HPrompt,
  fiveW1HSchema,
  generateFiveW1H,
} from "../src/services/fivew1h";
import { clearSessions, getSession, saveSession } from "../src/services/session";
import { DEMO_TRANSCRIPT } from "../src/services/transcript";

afterEach(() => {
  vi.unstubAllGlobals();
  clearSessions();
});

describe("constraints", () => {
  it("returns defaults for empty input", () => {
    expect(parseConstraints("")).toEqual({
      taskType: "article",
      style: "conversational",
      audience: "general readers",
      constraints: [],
      include5w1h: true,
    });
  });

  it("maps Chinese requirements and prohibitions", () => {
    const result = parseConstraints("给开发者看的正式分析，不要举例");
    expect(result.taskType).toBe("analysis");
    expect(result.style).toBe("formal");
    expect(result.audience).toBe("developers");
    expect(formatConstraints(result)).toContain("Honor every explicit prohibition");
  });
});

describe("session store", () => {
  it("round-trips a context and reports missing ids", async () => {
    const session = {
      id: "abc",
      transcript: DEMO_TRANSCRIPT,
      article: "<h2>One</h2><p>Body</p>",
      constraints: parseConstraints(""),
      chapters: [{ id: "chapter-1", title: "One" }],
      createdAt: 1,
    };
    await saveSession(undefined, session);
    expect(await getSession(undefined, "abc")).toEqual(session);
    expect(await getSession(undefined, "missing")).toBeNull();
  });
});

describe("5W1H service", () => {
  const summary = {
    who: "Mark",
    what: "AI revenue and cost trends",
    when: "Now and the next decade",
    where: "Consumer and enterprise AI",
    why: "Direct productivity value",
    how: "Subscriptions and token pricing",
  };

  it("builds a prompt with article and chapter", () => {
    expect(buildFiveW1HPrompt("full article", "Chapter 2")).toContain("Chapter 2");
    expect(fiveW1HSchema.safeParse(summary).success).toBe(true);
    expect(fiveW1HSchema.safeParse({ who: "only" }).success).toBe(false);
  });

  it("parses a Gemini JSON response", async () => {
    const inner = JSON.stringify(summary);
    const payload = { candidates: [{ content: { parts: [{ text: "```json\n" + inner + "\n```" }] } }] };
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(payload), { status: 200 }));
    const result = await generateFiveW1H("full article", "Chapter 2", {
      apiKey: "test",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result).toEqual(summary);
  });
});

describe("5W1H API", () => {
  const seed = async (): Promise<void> => {
    await saveSession(undefined, {
      id: "session-1",
      transcript: DEMO_TRANSCRIPT,
      article: "<h2>智能经济</h2><p>Body</p>",
      constraints: parseConstraints(""),
      chapters: [{ id: "chapter-1", title: "智能经济" }],
      createdAt: 1,
    });
  };

  it("summarizes a chapter from the stored context only", async () => {
    await seed();
    const inner = JSON.stringify({ who: "Mark", what: "收入", when: "当前", where: "市场", why: "价值", how: "订阅" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string) =>
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: inner }] } }] }),
          { status: 200 },
        ),
      ),
    );
    const response = await app.request(
      "/api/5w1h",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1", chapterId: "chapter-1" }),
      },
      { GEMINI_API_KEY: "test" },
    );
    expect(response.status).toBe(200);
    expect((await response.json() as { who: string }).who).toBe("Mark");
  });

  it("returns 404 for an unknown session", async () => {
    const response = await app.request("/api/5w1h", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "nope", chapterId: "chapter-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await app.request("/api/5w1h", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });
});
