import { z } from "zod";

export const transcriptQuerySchema = z.object({
  url: z.string().url(),
});
