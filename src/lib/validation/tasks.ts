import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
const taskContextSchema = z.record(z.string(), z.unknown());

export const taskCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    status: taskStatusSchema.optional().default("todo"),
    priority: taskPrioritySchema.optional().default("medium"),
    scheduledTime: z.string().datetime().optional().nullable(),
    context: taskContextSchema.optional(),
  })
  .transform((value) => ({
    ...value,
    context: value.context ?? {},
  }));

export const taskUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    scheduledTime: z.string().datetime().optional().nullable(),
    context: taskContextSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })
  .transform((value) => {
    const next: {
      title?: string;
      status?: z.infer<typeof taskStatusSchema>;
      priority?: z.infer<typeof taskPrioritySchema>;
      scheduledTime?: string | null;
      context?: Record<string, unknown>;
    } = {};
    if (value.title !== undefined) next.title = value.title;
    if (value.status !== undefined) next.status = value.status;
    if (value.priority !== undefined) next.priority = value.priority;
    if (value.scheduledTime !== undefined) next.scheduledTime = value.scheduledTime;
    if (value.context !== undefined) next.context = value.context ?? {};
    return next;
  });

export const taskListQuerySchema = z
  .object({
    status: taskStatusSchema.optional().nullable(),
    priority: taskPrioritySchema.optional().nullable(),
    from: z.string().datetime().optional().nullable(),
    to: z.string().datetime().optional().nullable(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .transform((value) => ({
    status: value.status ?? undefined,
    priority: value.priority ?? undefined,
    from: value.from ?? undefined,
    to: value.to ?? undefined,
    limit: value.limit,
    offset: value.offset,
  }));

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
