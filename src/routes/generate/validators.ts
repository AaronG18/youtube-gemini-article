import { z } from "zod";

export const generateBodySchema = z.object({
  url: z.string().url(),
});
