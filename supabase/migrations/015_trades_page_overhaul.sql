-- ============================================================
-- Migration 015: Trades Page Overhaul (Status, Manual Close, Archive)
-- Adds status, closed metadata, realized PnL fields to trade_alerts.
-- Creates archived_trade_alerts for soft-deleting trade alerts.
-- ============================================================

-- Add status & closure fields to trade_alerts if they don't exist
alter table public.trade_alerts 
  add column if not exists status text not null default 'active' check (status in ('active', 'closed')),
  add column if not exists closed_reason text check (closed_reason in ('tp_hit', 'sl_hit', 'manual_close')),
  add column if not exists exit_price numeric(18,7),
  add column if not exists closed_at timestamptz,
  add column if not exists close_notes text,
  add column if not exists realized_pnl_usd numeric(18,4),
  add column if not exists realized_pnl_pct numeric(18,4);

-- Table for archived trade alerts (soft-deleted trade alerts)
create table if not exists archived_trade_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  original_trade_alert_id uuid,
  watchlist_item_id uuid,
  symbol text not null,
  trigger_price numeric(18,7),
  trigger_direction text check (trigger_direction in ('above','below')),
  fired_price numeric(18,7),
  entry_price numeric(18,7),
  stop_loss numeric(18,7),
  take_profit numeric(18,7),
  order_type text check (order_type in ('limit','trigger_limit','market')),
  notes text,
  margin_usd numeric(18,4),
  leverage numeric(18,4),
  sl_fired_at timestamptz,
  tp_fired_at timestamptz,
  fired_at timestamptz,
  status_at_archive text not null default 'active' check (status_at_archive in ('active', 'closed')),
  closed_reason text check (closed_reason in ('tp_hit', 'sl_hit', 'manual_close')),
  exit_price numeric(18,7),
  closed_at timestamptz,
  close_notes text,
  realized_pnl_usd numeric(18,4),
  realized_pnl_pct numeric(18,4),
  archived_at timestamptz not null default now()
);

-- Row Level Security for archived_trade_alerts
alter table public.archived_trade_alerts enable row level security;

drop policy if exists "archived_trade_alerts_select_own" on archived_trade_alerts;
drop policy if exists "archived_trade_alerts_insert_own" on archived_trade_alerts;
drop policy if exists "archived_trade_alerts_update_own" on archived_trade_alerts;
drop policy if exists "archived_trade_alerts_delete_own" on archived_trade_alerts;

create policy "archived_trade_alerts_select_own" on archived_trade_alerts
  for select to authenticated using (auth.uid() = user_id);

create policy "archived_trade_alerts_insert_own" on archived_trade_alerts
  for insert to authenticated with check (auth.uid() = user_id);

create policy "archived_trade_alerts_update_own" on archived_trade_alerts
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "archived_trade_alerts_delete_own" on archived_trade_alerts
  for delete to authenticated using (auth.uid() = user_id);
