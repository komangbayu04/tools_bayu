-- ============================================================
--  Bayu Dashboard — Supabase schema (with Auth, per-user data)
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--
--  NOTE: This DROPS and recreates app_state. Safe to run now since the
--  table is still empty. Re-running later will WIPE existing data.
-- ============================================================

drop table if exists public.app_state cascade;

-- Key/value table that backs every Zustand store, scoped per authenticated
-- user. Each store persists its whole state as a JSON blob under (user_id, key).
create table public.app_state (
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

-- Row Level Security: each user can only read/write their own rows.
alter table public.app_state enable row level security;

create policy "own_rows_select"
  on public.app_state for select
  using (auth.uid() = user_id);

create policy "own_rows_write"
  on public.app_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
