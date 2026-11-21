import { z } from "zod";

export const fiveW1HBodySchema = z.object({
  sessionId: z.string().min(1),
  chapterId: z.string().min(1),
});
