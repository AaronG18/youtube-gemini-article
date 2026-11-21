import type { AppContext } from "../../types";

/** Report that the Worker is alive. */
export const healthHandler = (c: AppContext) =>
  c.json({ status: "ok", service: "youtube-gemini-article" });
