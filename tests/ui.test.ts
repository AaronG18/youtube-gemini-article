import { describe, expect, it } from "vitest";
import app from "../src/index";
import { extractChapters, sanitizeArticleHtml } from "../src/utils/html";

describe("article HTML utilities", () => {
  it("keeps whitelisted tags and strips attributes", () => {
    const clean = sanitizeArticleHtml(
      '<h2 class="x">Title</h2><p onclick="alert(1)">Hello <strong>world</strong></p>',
    );
    expect(clean).toBe("<h2>Title</h2><p>Hello <strong>world</strong></p>");
  });

  it("removes scripts, styles and unknown tags", () => {
    const clean = sanitizeArticleHtml(
      '<script>alert(1)</script><style>body{}</style><div><p>ok</p></div>',
    );
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("<div>");
    expect(clean).toContain("<p>ok</p>");
  });

  it("extracts chapters in order", () => {
    const chapters = extractChapters("<h2>One</h2><p>a</p><h2>Two</h2><p>b</p>");
    expect(chapters).toEqual([
      { id: "chapter-1", title: "One" },
      { id: "chapter-2", title: "Two" },
    ]);
  });
});

describe("single page", () => {
  it("serves the form and stream reader", async () => {
    const response = await app.request("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain('id="generate-form"');
    expect(html).toContain("/api/generate");
    expect(html).toContain("getReader()");
  });
});
