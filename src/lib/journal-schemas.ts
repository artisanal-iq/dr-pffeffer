import { z } from "zod";

export const tagSchema = z
  .string()
  .min(1)
  .max(32)
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, { message: "Tag cannot be blank" });
