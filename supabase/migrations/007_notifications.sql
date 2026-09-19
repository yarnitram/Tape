-- ============================================================
-- 007 — Notifications
-- User-scoped notifications for trade alerts, risk warnings,
-- system messages, and watchlist triggers.
-- ============================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null check (type in ('trade_alert','risk_warning','system','watchlist_trigger')),
  title text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- Index for common queries: user's unread notifications, ordered by newest
create index if not exists notifications_user_unread_idx
  on notifications (user_id, read, created_at desc);

-- Index for pagination
create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
alter table notifications enable row level security;

create policy "notifications_select_own" on notifications
  for select to authenticated using (auth.uid() = user_id);

create policy "notifications_insert_own" on notifications
  for insert to authenticated with check (auth.uid() = user_id);

create policy "notifications_update_own" on notifications
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications_delete_own" on notifications
  for delete to authenticated using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Helper function to create a notification (for server-side use)
-- ------------------------------------------------------------------
create or replace function create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text default null
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into notifications (user_id, type, title, message, link)
  values (p_user_id, p_type, p_title, p_message, p_link)
  returning id into v_id;
  return v_id;
end;
$$;