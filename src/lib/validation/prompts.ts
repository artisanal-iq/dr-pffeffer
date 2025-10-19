import { z } from "zod";

const slugRegex = /^[a-z0-9-]+$/;

export const promptCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120, "Slug must be at most 120 characters")
    .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and dashes"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(160, "Title must be at most 160 characters"),
  body: z.string().min(1, "Body is required"),
  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .max(80, "Category must be at most 80 characters")
    .default("general"),
});

export const promptUpdateSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .max(120, "Slug must be at most 120 characters")
      .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and dashes")
      .optional(),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(160, "Title must be at most 160 characters")
      .optional(),
    body: z.string().min(1, "Body is required").optional(),
    category: z
      .string()
      .trim()
      .min(1, "Category is required")
      .max(80, "Category must be at most 80 characters")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field must be provided",
  });

export const promptListQuerySchema = z.object({
  includeArchived: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
});

export const promptIdParamSchema = z.object({
  promptId: z.string().uuid(),
});

export const promptAuditQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(200, "Limit must be at most 200")
    .optional(),
});
