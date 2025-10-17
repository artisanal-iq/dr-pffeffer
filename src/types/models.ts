 export type UUID = string;

export type Task = {
  id: UUID;
  user_id: UUID;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  scheduled_time: string | null; // ISO
  context: string | null;
  created_at: string;
  updated_at: string;
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

export type Settings = {
  id: UUID;
  user_id: UUID;
  theme: string | null;
  notifications: boolean;
  ai_persona: string | null;
  created_at: string;
  updated_at: string;
}
