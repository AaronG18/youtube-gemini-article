import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("health API", () => {
  it("returns ok", async () => {
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "youtube-gemini-article",
    });
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const response = await app.request("/api/nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });
});
