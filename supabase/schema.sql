-- ============================================================
--  Bayu Dashboard — Supabase schema
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Single key/value table that backs every Zustand store. Each store persists
-- its whole state as a JSON blob under a unique key (e.g. "bayu:tasks-storage-v2").
create table if not exists public.app_state (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Enable Row Level Security.
alter table public.app_state enable row level security;

-- Single-user personal dashboard: allow full public (anon key) access.
-- NOTE: when you add Supabase Auth later, replace this with a policy scoped to
-- auth.uid() and add a user_id column.
drop policy if exists "public_read"  on public.app_state;
drop policy if exists "public_write" on public.app_state;

create policy "public_read"
  on public.app_state for select
  using (true);

create policy "public_write"
  on public.app_state for all
  using (true)
  with check (true);
