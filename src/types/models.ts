 export type UUID = string;

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskContext = Record<string, unknown>;

export type Task = {
  id: UUID;
  user_id: UUID;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  scheduled_time: string | null; // ISO
  duration_minutes: number;
  context: TaskContext;
  created_at: string;
  updated_at: string;
};

export type TaskListParams = {
  status?: TaskStatus;
  priority?: TaskPriority;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type TaskListParamsNormalized = {
  status?: TaskStatus;
  priority?: TaskPriority;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

export type TaskListResponse = {
  items: Task[];
  count: number;
};

export type TaskCompletionMetric = {
  user_id: UUID;
  bucket_date: string; // YYYY-MM-DD
  completed_count: number;
  updated_at: string;
}

export type TaskDashboardMetric = {
  user_id: UUID;
  total_completed: number;
  completed_last_7_days: number;
  completed_today: number;
  most_recent_completion_date: string | null;
  daily_check_ins_last_7_days: number;
  last_check_in_at: string | null;
  auto_plan_percentage_last_7_days: number;
}

export type JournalSummaryMetadata = {
  tone: "positive" | "neutral" | "negative";
  confidence: "low" | "medium" | "high";
  influence: "low" | "medium" | "high";
  key_themes: string[];
  behavior_cue: string;
  word_count: number;
  evidence: string[];
  generated_at: string;
};

export type Journal = {
  id: UUID;
  user_id: UUID;
  entry: string;
  ai_summary: string | null;
  summary_metadata: JournalSummaryMetadata | null;
  tags: string[];
  date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export type PowerPractice = {
  id: UUID;
  user_id: UUID;
  date: string; // YYYY-MM-DD
  focus: string;
  reflection: string | null;
  rating: number | null;
  ai_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export type ReflectionDashboardMetric = {
  user_id: UUID;
  avg_confidence_all_time: number | null;
  avg_confidence_last_7_days: number | null;
  reflections_last_7_days: number;
  current_reflection_streak: number;
  best_reflection_streak: number;
  latest_reflection_date: string | null;
}

export type Connection = {
  id: UUID;
  user_id: UUID;
  name: string;
  org: string | null;
  category: string | null;
  last_contact: string | null; // ISO
  next_action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NudgeScheduleEntry = {
  time: string;
  enabled: boolean;
};

export type Settings = {
  id: UUID;
  user_id: UUID;
  theme: string | null;
  notifications: boolean;
  ai_persona: string | null;
  persona: string | null;
  work_start: string | null;
  work_end: string | null;
  theme_contrast: string | null;
  accent_color: string | null;
  nudge_schedule: NudgeScheduleEntry[];
  created_at: string;
  updated_at: string;
};

export type Prompt = {
  id: UUID;
  slug: string;
  title: string;
  body: string;
  category: string;
  is_active: boolean;
  created_by: UUID;
  updated_by: UUID;
  archived_by: UUID | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type PromptListResponse = {
  items: Prompt[];
};

export type PromptAuditEvent = {
  id: UUID;
  prompt_id: UUID;
  action: "created" | "updated" | "archived" | "restored";
  actor_id: UUID;
  actor_email: string | null;
  changes: Record<string, unknown>;
  created_at: string;
};

export type PromptAuditListResponse = {
  items: PromptAuditEvent[];
};
