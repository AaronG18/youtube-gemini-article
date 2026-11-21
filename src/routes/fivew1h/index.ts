import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Bindings } from "../../types";
import { handleFiveW1H } from "./handlers";
import { fiveW1HBodySchema } from "./validators";

export const fivew1h = new Hono<{ Bindings: Bindings }>();

fivew1h.post("/", zValidator("json", fiveW1HBodySchema), (c) => {
  const { sessionId, chapterId } = c.req.valid("json");
  return handleFiveW1H(c, sessionId, chapterId);
});
