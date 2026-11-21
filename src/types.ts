import type { Context } from "hono";

/** Worker environment bindings. */
export interface Bindings {
  GEMINI_API_KEY?: string;
  ARTICLE_CONTEXT?: KVNamespace;
  TRANSCRIPT_ENDPOINT?: string;
}

/** Hono context used by every route in this Worker. */
export type AppContext = Context<{ Bindings: Bindings }>;
