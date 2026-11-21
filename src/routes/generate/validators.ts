import { z } from "zod";

export const generateBodySchema = z.object({
  url: z.string().url(),
  requirements: z.string().max(2000).optional().default(""),
});
