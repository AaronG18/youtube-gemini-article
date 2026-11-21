import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import {
  DEMO_VIDEO_ID,
  getTranscript,
  InvalidYouTubeUrlError,
  TranscriptUnavailableError,
} from "../src/services/transcript";
import { parseYouTubeVideoId } from "../src/utils/youtube";

afterEach(() => vi.unstubAllGlobals());

describe("parseYouTubeVideoId", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${DEMO_VIDEO_ID}`, DEMO_VIDEO_ID],
    [`https://youtu.be/${DEMO_VIDEO_ID}`, DEMO_VIDEO_ID],
    [`https://www.youtube.com/embed/${DEMO_VIDEO_ID}`, DEMO_VIDEO_ID],
    [`https://www.youtube.com/shorts/${DEMO_VIDEO_ID}`, DEMO_VIDEO_ID],
  ])("parses %s", (url, expected) => {
    expect(parseYouTubeVideoId(url)).toBe(expected);
  });

  it("rejects unrelated URLs", () => {
    expect(parseYouTubeVideoId("https://example.com/watch?v=12345678901")).toBeNull();
  });
});

describe("getTranscript", () => {
  it("returns the built-in demo transcript for the sample video", async () => {
    const { videoId, transcript } = await getTranscript(
      `https://www.youtube.com/watch?v=${DEMO_VIDEO_ID}`,
    );
    expect(videoId).toBe(DEMO_VIDEO_ID);
    expect(transcript.segments.length).toBeGreaterThanOrEqual(8);
    expect(transcript.segments[0].text).toContain("Anderson");
  });

  it("throws for an invalid URL", async () => {
    await expect(getTranscript("https://example.com")).rejects.toBeInstanceOf(
      InvalidYouTubeUrlError,
    );
  });

  it("throws a captcha hint when no endpoint is configured", async () => {
    await expect(getTranscript("https://youtu.be/abcdefghijk")).rejects.toBeInstanceOf(
      TranscriptUnavailableError,
    );
  });

  it("uses a configured transcript endpoint", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ segments: [{ text: "Remotely fetched", start: 0, duration: 1 }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { transcript } = await getTranscript("https://youtu.be/abcdefghijk", {
      transcriptEndpoint: "https://transcript.example.com/api",
    });
    expect(transcript.segments[0].text).toBe("Remotely fetched");
    expect(fetchMock.mock.calls[0][0]).toContain("videoId=abcdefghijk");
  });
});

describe("transcript API", () => {
  it("returns demo segments", async () => {
    const response = await app.request(
      `/api/transcript?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${DEMO_VIDEO_ID}`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { segments: unknown[] };
    expect(body.segments.length).toBeGreaterThanOrEqual(8);
  });

  it("rejects a non-YouTube URL with 400", async () => {
    const response = await app.request("/api/transcript?url=https%3A%2F%2Fexample.com");
    expect(response.status).toBe(400);
  });

  it("rejects a missing url with 400", async () => {
    const response = await app.request("/api/transcript");
    expect(response.status).toBe(400);
  });
});
