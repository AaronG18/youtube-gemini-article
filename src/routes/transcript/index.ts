import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Bindings } from "../../types";
import { handleTranscript } from "./handlers";
import { transcriptQuerySchema } from "./validators";

export const transcript = new Hono<{ Bindings: Bindings }>();

transcript.get("/", zValidator("query", transcriptQuerySchema), (c) =>
  handleTranscript(c, c.req.valid("query").url),
);
