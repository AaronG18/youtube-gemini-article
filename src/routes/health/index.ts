import { Hono } from "hono";
import type { Bindings } from "../../types";
import { healthHandler } from "./handlers";

export const health = new Hono<{ Bindings: Bindings }>();

health.get("/", healthHandler);
