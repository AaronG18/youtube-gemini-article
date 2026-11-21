import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Bindings } from "../../types";
import { handleGenerate } from "./handlers";
import { generateBodySchema } from "./validators";

export const generate = new Hono<{ Bindings: Bindings }>();

generate.post("/", zValidator("json", generateBodySchema), (c) => {
  const { url, requirements } = c.req.valid("json");
  return handleGenerate(c, url, requirements);
});
