 # Power Practice Planner — Technical Specification (MVP)

 Owner: Jay Jordan
 Stack: Next.js (App Router) + TypeScript, TailwindCSS + shadcn/ui, React Query + Zustand, Supabase (Auth/Postgres/RLS), Drizzle ORM, Vercel AI SDK (stubs), Vercel deploy
 Package manager: pnpm

 ## 1) System Architecture

 - Frontend: Next.js App Router (server components-first), TailwindCSS, shadcn/ui
 - Auth: Supabase Auth (email/password, magic links)
 - Data: Supabase Postgres with RLS; Drizzle ORM for schema/types/migrations
 - State:
   - Server: Route Handlers (app/api/*) for CRUD
   - Client: React Query for fetching/mutations, Zustand for lightweight UI/app state
 - AI: Vercel AI SDK integrated via server route handlers; falls back to deterministic stubs when no key is provided
 - Deploy: Vercel (Preview → Production)
 - CI: GitHub Actions (pnpm install — frozen lockfile, lint, typecheck, build)

 Environment variables (example):
 - NEXT_PUBLIC_SUPABASE_URL
 - NEXT_PUBLIC_SUPABASE_ANON_KEY
 - SUPABASE_SERVICE_ROLE_KEY (server-only; not required for MVP runtime)
 - SUPABASE_DB_URL (for Drizzle migrations; local only)
 - OPENAI_API_KEY (optional for AI)
 - CRON_SECRET (for future scheduled endpoints)

 A .env.example will be provided.

 ## 2) API Endpoints (Next.js Route Handlers)

 All endpoints require Supabase-authenticated user. Return 401 if no session. Enforce row ownership on server and via RLS.

 Base URL: /api

 - Tasks
   - GET /tasks?status=&context=&from=&to=&limit=&offset=
   - POST /tasks
   - GET /tasks/[id]
   - PATCH /tasks/[id]
   - DELETE /tasks/[id]

 - Power Practices (daily routine)
   - GET /power-practices?date=YYYY-MM-DD
   - POST /power-practices  (create/update day’s focus, reflection, rating)
   - GET /power-practices/[id]
   - PATCH /power-practices/[id]
   - DELETE /power-practices/[id]

 - Journals
   - GET /journals?from=&to=&limit=&offset=
   - POST /journals
   - GET /journals/[id]
   - PATCH /journals/[id]
   - DELETE /journals/[id]
   - POST /journals/[id]/ai-summary  (generates/refreshes summary via AI if key available, else stub)

 - Connections (simple CRM)
   - GET /connections?search=&category=&limit=&offset=
   - POST /connections
   - GET /connections/[id]
   - PATCH /connections/[id]
   - DELETE /connections/[id]

 - Settings
   - GET /settings
   - PATCH /settings

 - Dashboard
   - GET /dashboard/score?from=&to=  (returns daily power score series and heatmap-ready data)

 Error shape:
 - 4xx/5xx: { error: { code: string; message: string } }

 ## 3) Data Models (Zod and JSON contract)

 Task
 - id: string (uuid)
 - title: string (1..200)
 - status: “todo” | “in_progress” | “done”
 - priority: “low” | “medium” | “high”
 - scheduledTime: string | null (ISO datetime)
 - context: string | null
 - createdAt: string (ISO)
 - updatedAt: string (ISO)

 PowerPractice
 - id: string (uuid)
 - date: string (YYYY-MM-DD)
 - focus: string (<= 280)
 - reflection: string (<= 4000)
 - rating: number (1..5)
 - aiFeedback: string | null
 - createdAt, updatedAt

 Journal
 - id: string (uuid)
 - entry: string (<= 8000)
 - aiSummary: string | null
 - date: string (YYYY-MM-DD)
 - createdAt, updatedAt

 Connection
 - id: string (uuid)
 - name: string
 - org: string | null
 - category: string | null
 - lastContact: string | null (ISO)
 - nextAction: string | null
 - notes: string | null
 - createdAt, updatedAt

 Settings
 - id: string (uuid)
 - theme: “light” | “dark” | “system”
 - notifications: boolean
 - aiPersona: string | null
 - createdAt, updatedAt

 All records include userId (uuid) as FK to auth.uid().

 ## 4) Supabase SQL (DDL + RLS)

 Run as initial migration (one-time). Uses gen_random_uuid().

 - Extensions
   - create extension if not exists pgcrypto;

 - Tables (all with user_id uuid not null)
   - users table: Not needed; use Supabase auth schema. We’ll store per-user app settings in settings table.

 Example: tasks
 - id uuid primary key default gen_random_uuid()
 - user_id uuid not null
 - title text not null
 - status text not null check (status in ('todo','in_progress','done'))
 - priority text not null check (priority in ('low','medium','high'))
 - scheduled_time timestamptz null
 - context text null
 - created_at timestamptz not null default now()
 - updated_at timestamptz not null default now()

 Other tables (power_practices, journals, connections, settings) mirror the fields as per models.

 Indexes
 - create index on each table (user_id)
 - additional helpful: tasks (scheduled_time), power_practices (date), journals (date), connections (last_contact)

 RLS
 - alter table <table> enable row level security;
 - Policy template (apply to all tables):
   - create policy "Allow owner read"
     on <table> for select
     using (auth.uid() = user_id);
   - create policy "Allow owner insert"
     on <table> for insert
     with check (auth.uid() = user_id);
   - create policy "Allow owner update"
     on <table> for update
     using (auth.uid() = user_id)
     with check (auth.uid() = user_id);
   - create policy "Allow owner delete"
     on <table> for delete
     using (auth.uid() = user_id);

 Triggers
 - updated_at columns: create trigger to set updated_at = now() on update.

 I will include a full SQL file in the repo to run via Supabase SQL editor.

 ## 5) Drizzle ORM Schema (TypeScript)

 - Package: drizzle-orm/postgres-js + postgres
 - Config: drizzle.config.ts uses SUPABASE_DB_URL with pgbouncer flags when available:
   - ?pgbouncer=true&connection_limit=1&sslmode=require&prepareThreshold=0

 Schema file: src/db/schema.ts
 - tasks, powerPractices, journals, connections, settings
 - enums via check constraints (string unions at TS level)
 - relations: none cross-user, just user_id FK

 Migrations
 - drizzle-kit generate:sync to produce SQL from schema (we’ll maintain initial migration mirroring the SQL above).

 Note: For runtime CRUD we will primarily use Supabase client (supabase-js) to benefit from RLS and auth context. Drizzle is used for schema/types/migrations. This keeps auth simple and secure.

 ## 6) Routing and Component Tree

 App routes
 - /(auth)
   - /login
   - /callback (Supabase)
 - /(app)
   - /dashboard
   - /planner
   - /journal
   - /connections
   - /settings
 - /api/* (as above)

 Layout
 - RootLayout: ThemeProvider, SupabaseProvider, QueryClientProvider
 - AppLayout (sidebar + header nav)

 Pages (RSC-first with client components where needed)
 - Dashboard
   - components: DailyPowerScoreCard, ConsistencyHeatmap, QuickAddButtons
 - Planner
   - TaskList, TaskEditorModal, SchedulePicker (simple weekly view), Filters
 - Journal
   - JournalEditor, JournalList, JournalSummary
 - Connections
   - ConnectionList, ConnectionEditor
 - Settings
   - ProfileCard (read-only from Auth), PreferencesForm

 Shared components
 - UI via shadcn/ui primitives
 - Form inputs (zod + react-hook-form)
 - Toast/Toaster
 - EmptyState, LoadingState

 State
 - React Query: queries/mutations per entity
 - Zustand: ephemeral UI state (modals, filters, selection)

 ## 7) Power Score Calculation (Server)

 GET /api/dashboard/score
 - Inputs: date range
 - Output: { days: [{ date, powerScore, tasksCompletedPct, reflections, confidenceAvg }], streaks: { current, best } }
 - Power score (MVP): weighted blend
   - tasksCompletedPct (50%)
   - reflection presence (30%)
   - confidence rating normalized (20%)

 ## 8) AI Integrations (MVP-ready stubs)

 - Daily Power Focus: server util generateDailyFocus()
   - If OPENAI_API_KEY present, call Vercel AI SDK with system + user prompt (PRD’s prompt)
   - Else return deterministic rotating prompts from a small curated list
 - Reflection Summary: POST /journals/[id]/ai-summary
   - Similar fallback pattern

 Prompts will follow section 10 of the PRD.

 ## 9) Security, Privacy, and RLS

 - All writes include user_id = auth.uid() server-side (never trust client-provided user_id)
 - RLS enforces per-user data
 - Journals: MVP stores plaintext; roadmap note for client-side encryption
 - Secrets: never exposed to client; .env.example lists required keys

 ## 10) CI/CD and Quality Gates

 - GitHub Actions:
   - setup-node@v4 with pnpm via corepack
   - pnpm install --frozen-lockfile
   - pnpm lint
   - pnpm typecheck
   - pnpm build
 - PR template marking “Droid-assisted”, includes check summaries
 - Vercel: connect repo after MVP to deploy previews and prod

 ## 11) .env.example

 - NEXT_PUBLIC_SUPABASE_URL=
 - NEXT_PUBLIC_SUPABASE_ANON_KEY=
 - SUPABASE_DB_URL=
 - OPENAI_API_KEY=
 - CRON_SECRET=

 ## 12) Milestone Deliverables (MVP)

 - Repo scaffold with app shell and pages
 - Auth wired (login/logout, session-aware UI)
 - CRUD: tasks, power_practices, journals, connections, settings
 - Dashboard power score + heatmap
 - AI stubs functional, real AI when key present
 - CI green, PR open
