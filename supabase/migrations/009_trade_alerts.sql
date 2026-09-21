-- ============================================================
-- 009 — Trade alerts log
-- Every time a watchlist price-trigger fires, the token data
-- (symbol, trigger, fired price, and the saved trade plan) is
-- logged here and displayed on the /trades page table.
-- Owner-scoped via RLS. Idempotent: safe to re-run.
-- ============================================================

create table if not exists trade_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  -- The watchlist row that fired; kept after the item is deleted.
  watchlist_item_id uuid references public.watchlist_items on delete set null,
  symbol text not null,
  trigger_price numeric(18,7),
  trigger_direction text check (trigger_direction in ('above','below')),
  -- Last price when the alert fired.
  fired_price numeric(18,7),
  -- Saved trade plan at fire time.
  entry_price numeric(18,7),
  stop_loss numeric(18,7),
  take_profit numeric(18,7),
  -- Intended order type when the trigger fired.
  order_type text check (order_type in ('limit','trigger_limit','market')),
  notes text,
  fired_at timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Index for the /trades page: user's fired alerts, newest first.
create index if not exists trade_alerts_user_fired_idx
  on public.trade_alerts (user_id, fired_at desc);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
alter table public.trade_alerts enable row level security;

-- Policies are dropped first so this migration is safe to re-run in the
-- Supabase SQL editor (create policy errors if the policy already exists).
drop policy if exists "trade_alerts_select_own" on trade_alerts;
drop policy if exists "trade_alerts_insert_own" on trade_alerts;
drop policy if exists "trade_alerts_update_own" on trade_alerts;
drop policy if exists "trade_alerts_delete_own" on trade_alerts;

create policy "trade_alerts_select_own" on trade_alerts
  for select to authenticated using (auth.uid() = user_id);

create policy "trade_alerts_insert_own" on trade_alerts
  for insert to authenticated with check (auth.uid() = user_id);

create policy "trade_alerts_update_own" on trade_alerts
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trade_alerts_delete_own" on trade_alerts
  for delete to authenticated using (auth.uid() = user_id);