-- ============================================================
-- 005 — Watchlist trigger creation time
-- Records when the price-trigger was set so the user can see, for
-- each saved coin, both when the alert was armed (trigger_created_at)
-- and when it fired (alert_fired_at). trigger_created_at is emptied
-- when the trigger is cleared.
-- ============================================================

alter table public.watchlist_items
  add column if not exists trigger_created_at timestamptz;