-- ============================================================
-- 003 — User settings (notification config)
-- Per-user notification settings, read by the app and the
-- always-on alert watcher. Owner-scoped via RLS.
-- ============================================================

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  discord_webhook_url text,
  notify_discord boolean not null default true,
  notify_desktop boolean not null default true,
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  to authenticated using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  to authenticated with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);