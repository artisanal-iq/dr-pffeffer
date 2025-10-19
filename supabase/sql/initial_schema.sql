 -- Extensions
 create extension if not exists pgcrypto;

 -- Tasks
 create table if not exists public.tasks (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
   title text not null,
   status text not null check (status in ('todo','in_progress','done')),
   priority text not null check (priority in ('low','medium','high')),
   scheduled_time timestamptz null,
   context text null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
 create index if not exists tasks_user_id_idx on public.tasks (user_id);
 create index if not exists tasks_scheduled_time_idx on public.tasks (scheduled_time);

 -- Power practices
 create table if not exists public.power_practices (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
   date text not null,
   focus text not null,
   reflection text null,
   rating int null,
   ai_feedback text null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
 create index if not exists power_practices_user_id_idx on public.power_practices (user_id);
 create index if not exists power_practices_date_idx on public.power_practices (date);

 -- Journals
 create table if not exists public.journals (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
   entry text not null,
   ai_summary text null,
   date text not null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
 create index if not exists journals_user_id_idx on public.journals (user_id);
 create index if not exists journals_date_idx on public.journals (date);

 -- Connections
 create table if not exists public.connections (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
   name text not null,
   org text null,
   category text null,
   last_contact timestamptz null,
   next_action text null,
   notes text null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
 create index if not exists connections_user_id_idx on public.connections (user_id);
 create index if not exists connections_last_contact_idx on public.connections (last_contact);

 -- Settings
 create table if not exists public.settings (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
   theme text null,
   notifications boolean not null default true,
   ai_persona text null,
   persona text null,
   work_start time null,
   work_end time null,
   theme_contrast text null,
   accent_color text null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
 create index if not exists settings_user_id_idx on public.settings (user_id);

 -- RLS
 alter table public.tasks enable row level security;
 alter table public.power_practices enable row level security;
 alter table public.journals enable row level security;
 alter table public.connections enable row level security;
 alter table public.settings enable row level security;

 -- Policies template per table
do $$
declare t text;
begin
  for t in select unnest(array['tasks','power_practices','journals','connections','settings']) loop
    -- Drop existing policies if present (CREATE POLICY doesn't support IF NOT EXISTS)
    execute format('drop policy if exists %I on public.%I;', 'owner_select', t);
    execute format('drop policy if exists %I on public.%I;', 'owner_insert', t);
    execute format('drop policy if exists %I on public.%I;', 'owner_update', t);
    execute format('drop policy if exists %I on public.%I;', 'owner_delete', t);

    -- Recreate policies
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id);', 'owner_select', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id);', 'owner_insert', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', 'owner_update', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id);', 'owner_delete', t);
  end loop;
end $$;

 -- updated_at triggers
 create or replace function public.set_updated_at()
 returns trigger as $$
 begin
   new.updated_at = now();
   return new;
 end;
 $$ language plpgsql;

 do $$
 declare t text;
 begin
   for t in select unnest(array['tasks','power_practices','journals','connections','settings']) loop
     execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at();', t || '_set_updated_at', t);
   end loop;
 end $$;
