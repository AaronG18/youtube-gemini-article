import { Hono } from "hono";
import { renderPage } from "../../ui/page";

export const ui = new Hono();

ui.get("/", (c) => c.html(renderPage()));
