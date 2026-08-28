-- =========================================================
-- ad. studio — Supabase schema (run in the SQL Editor)
-- Multi-user SaaS: every row is scoped to its owner via RLS.
-- =========================================================

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null default '',
  client text not null default '',
  status text not null default 'idea',
  brief text not null default '',
  due_date text not null default '',
  color text not null default '#d4ff2f',
  pos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- clients ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  color text not null default '#d4ff2f',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- tasks (kanban) ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null default '',
  title text not null,
  column_id text not null default 'backlog',
  pos integer not null default 0,
  tag text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.projects enable row level security;
alter table public.clients  enable row level security;
alter table public.tasks    enable row level security;

-- owner-only policies
drop policy if exists "owner select" on public.projects;
create policy "owner select" on public.projects
  for select using (auth.uid() = user_id);
drop policy if exists "owner insert" on public.projects;
create policy "owner insert" on public.projects
  for insert with check (auth.uid() = user_id);
drop policy if exists "owner update" on public.projects;
create policy "owner update" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owner delete" on public.projects;
create policy "owner delete" on public.projects
  for delete using (auth.uid() = user_id);

drop policy if exists "owner select" on public.clients;
create policy "owner select" on public.clients
  for select using (auth.uid() = user_id);
drop policy if exists "owner insert" on public.clients;
create policy "owner insert" on public.clients
  for insert with check (auth.uid() = user_id);
drop policy if exists "owner update" on public.clients;
create policy "owner update" on public.clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owner delete" on public.clients;
create policy "owner delete" on public.clients
  for delete using (auth.uid() = user_id);

drop policy if exists "owner select" on public.tasks;
create policy "owner select" on public.tasks
  for select using (auth.uid() = user_id);
drop policy if exists "owner insert" on public.tasks;
create policy "owner insert" on public.tasks
  for insert with check (auth.uid() = user_id);
drop policy if exists "owner update" on public.tasks;
create policy "owner update" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owner delete" on public.tasks;
create policy "owner delete" on public.tasks
  for delete using (auth.uid() = user_id);

-- ---------- realtime ----------
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.tasks;
