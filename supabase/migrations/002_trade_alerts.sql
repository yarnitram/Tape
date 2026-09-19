-- ============================================================
-- 002 — Trade alerts
-- Extends watchlist_items with a price trigger + trade plan so a
-- background watcher can notify the user via Discord / desktop when
-- the coin's last price crosses the trigger.
-- ============================================================

-- Trigger: when the coin hits this price the alert fires.
-- Reuses existing "alert_price" as the trigger price (kept in sync in app).
alter table public.watchlist_items
  add column if not exists trigger_price numeric(14,4);

-- Direction of the trigger: fire when price rises ABOVE or falls BELOW.
alter table public.watchlist_items
  add column if not exists trigger_direction text
  check (trigger_direction in ('above','below'));

-- Trade plan the user intends to take when the trigger hits.
alter table public.watchlist_items
  add column if not exists entry_price numeric(14,4);
alter table public.watchlist_items
  add column if not exists stop_loss numeric(14,4);
alter table public.watchlist_items
  add column if not exists take_profit numeric(14,4);

-- Whether the alert has fired, so the watcher does not re-notify repeatedly.
alter table public.watchlist_items
  add column if not exists alert_fired boolean not null default false;

-- When the alert last fired (for display / re-arm bookkeeping).
alter table public.watchlist_items
  add column if not exists alert_fired_at timestamptz;

-- Keep RLS policies intact (already owner-scoped via user_id).
-- No new constraints needed: the columns are optional.</think>

<｜DSML｜tool_calls>
<｜DSML｜invoke name="write">
<｜DSML｜parameter name="content" string="true">-- ============================================================
-- 002 — Trade alerts
-- Extends watchlist_items with a price trigger + trade plan so a
-- background watcher can notify the user via Discord / desktop when
-- the coin's last price crosses the trigger.
-- ============================================================

-- Trigger: when the coin hits this price the alert fires.
alter table public.watchlist_items
  add column if not exists trigger_price numeric(14,4);

-- Direction of the trigger: fire when price rises ABOVE or falls BELOW.
alter table public.watchlist_items
  add column if not exists trigger_direction text
  check (trigger_direction in ('above','below'));

-- Trade plan the user intends to take when the trigger hits.
alter table public.watchlist_items
  add column if not exists entry_price numeric(14,4);
alter table public.watchlist_items
  add column if not exists stop_loss numeric(14,4);
alter table public.watchlist_items
  add column if not exists take_profit numeric(14,4);

-- Whether the alert has fired, so the watcher does not re-notify repeatedly.
alter table public.watchlist_items
  add column if not exists alert_fired boolean not null default false;

-- When the alert last fired (for display / re-arm bookkeeping).
alter table public.watchlist_items
  add column if not exists alert_fired_at timestamptz;

-- Keep existing RLS policies intact (owner-scoped via user_id).