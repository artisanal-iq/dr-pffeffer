import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskCompletionMetrics = pgTable(
  "task_completion_metrics",
  {
    userId: uuid("user_id").notNull(),
    bucketDate: date("bucket_date").notNull(),
    completedCount: integer("completed_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.bucketDate] }),
  })
);

export const powerPractices = pgTable(
  "power_practices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    focus: text("focus").notNull(),
    reflection: text("reflection"),
    rating: integer("rating"), // 1..5
    aiFeedback: text("ai_feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userDateKey: uniqueIndex("power_practices_user_date_key").on(table.userId, table.date),
  })
);

export const journals = pgTable("journals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  entry: text("entry").notNull(),
  aiSummary: text("ai_summary"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  org: text("org"),
  category: text("category"),
  lastContact: timestamp("last_contact", { withTimezone: true }),
  nextAction: text("next_action"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  theme: varchar("theme", { length: 16 }), // light | dark | system
  notifications: boolean("notifications").default(true).notNull(),
  aiPersona: text("ai_persona"),
  persona: text("persona"),
  workStart: time("work_start"),
  workEnd: time("work_end"),
  themeContrast: varchar("theme_contrast", { length: 24 }),
  accentColor: varchar("accent_color", { length: 24 }),
  nudgeSchedule: jsonb("nudge_schedule")
    .$type<Array<{ time: string; enabled: boolean }>>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const prompts = pgTable("prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").notNull(),
  updatedBy: uuid("updated_by").notNull(),
  archivedBy: uuid("archived_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const promptAuditActionEnum = pgEnum("prompt_audit_action", [
  "created",
  "updated",
  "archived",
  "restored",
]);

export const promptAudits = pgTable("prompt_audits", {
  id: uuid("id").defaultRandom().primaryKey(),
  promptId: uuid("prompt_id").notNull(),
  action: promptAuditActionEnum("action").notNull(),
  actorId: uuid("actor_id").notNull(),
  actorEmail: text("actor_email"),
  changes: jsonb("changes").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
