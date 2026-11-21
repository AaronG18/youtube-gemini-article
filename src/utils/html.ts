const ALLOWED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "p",
  "blockquote",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "br",
]);

export interface Chapter {
  id: string;
  title: string;
}

/** Remove scripts, styles, attributes and tags outside the article whitelist. */
export const sanitizeArticleHtml = (raw: string): string => {
  const withoutBlocks = raw.replace(
    /<\s*\/?\s*(script|style|iframe|object)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  return withoutBlocks.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, name: string, attrs: string) => {
    const tag = name.toLowerCase();
    if (ALLOWED_TAGS.has(tag)) {
      return match.replace(attrs, "");
    }
    return "";
  });
};

/** Extract h2 headings so the UI can add chapter-level actions. */
export const extractChapters = (html: string): Chapter[] => {
  const chapters: Chapter[] = [];
  const pattern = /<h2>([\s\S]*?)<\/h2>/gi;
  for (const match of html.matchAll(pattern)) {
    const title = match[1].replace(/<[^>]+>/g, "").trim();
    if (title) {
      chapters.push({ id: `chapter-${chapters.length + 1}`, title });
    }
  }
  return chapters;
};
