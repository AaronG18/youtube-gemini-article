import { generateFiveW1H } from "../../services/fivew1h";
import { getSession } from "../../services/session";
import type { AppContext } from "../../types";

/** Summarize one chapter using the server-side generation context. */
export const handleFiveW1H = async (
  c: AppContext,
  sessionId: string,
  chapterId: string,
) => {
  const session = await getSession(c.env?.ARTICLE_CONTEXT, sessionId);
  if (!session) {
    return c.json({ error: "Session not found or expired" }, 404);
  }
  const chapter =
    session.chapters.find((item) => item.id === chapterId) ??
    session.chapters.find((item) => item.title === chapterId);
  if (!chapter) {
    return c.json({ error: "Chapter not found" }, 404);
  }
  const apiKey = c.env?.GEMINI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "GEMINI_API_KEY is not configured" }, 503);
  }
  try {
    const summary = await generateFiveW1H(session.article, chapter.title, { apiKey });
    return c.json(summary);
  } catch {
    return c.json({ error: "Could not generate the summary" }, 502);
  }
};
