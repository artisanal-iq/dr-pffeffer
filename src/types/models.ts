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
}

export type Journal = {
  id: UUID;
  user_id: UUID;
  entry: string;
  ai_summary: string | null;
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
}
