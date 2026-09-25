-- ============================================================
-- Migration 012: triggered_watchlist_items
-- Stores fired watchlist tokens shown in the "Triggered" tab.
-- The active watchlist row is deleted on fire; this table is
-- the permanent archive. Each row has a "Move back" action that
-- re-inserts into watchlist_items (with the full plan) and then
-- deletes from this table.
-- ============================================================

create table if not exists triggered_watchlist_items (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users not null,
  -- Original watchlist_items id (kept for reference after the row is deleted).
  source_item_id    uuid,
  symbol            text        not null,
  -- Trigger that was set on the watchlist item.
  trigger_price     numeric(18,7),
  trigger_direction text        check (trigger_direction in ('above','below')),
  -- Actual MEXC last price at the moment the trigger fired.
  fired_price       numeric(18,7),
  -- Trade plan values at fire time.
  entry_price       numeric(18,7),
  stop_loss         numeric(18,7),
  take_profit       numeric(18,7),
  order_type        text        check (order_type in ('limit','trigger_limit','market')),
  notes             text,
  fired_at          timestamptz not null default now(),
  created_at        timestamptz          default now()
);

alter table triggered_watchlist_items enable row level security;

create policy "triggered_watchlist_select_own"
  on triggered_watchlist_items for select
  to authenticated using (auth.uid() = user_id);

create policy "triggered_watchlist_insert_own"
  on triggered_watchlist_items for insert
  to authenticated with check (auth.uid() = user_id);

create policy "triggered_watchlist_delete_own"
  on triggered_watchlist_items for delete
  to authenticated using (auth.uid() = user_id);
