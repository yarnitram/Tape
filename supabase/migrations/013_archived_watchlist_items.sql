-- ============================================================
-- Migration 013: archived_watchlist_items
-- Holds soft-deleted items from active Watchlist and Triggered tabs.
-- ============================================================

create table if not exists archived_watchlist_items (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users not null,
  symbol            text        not null,
  trigger_price     numeric(18,7),
  trigger_direction text        check (trigger_direction in ('above','below')),
  fired_price       numeric(18,7),
  entry_price       numeric(18,7),
  stop_loss         numeric(18,7),
  take_profit       numeric(18,7),
  order_type        text        check (order_type in ('limit','trigger_limit','market')),
  notes             text,
  archive_source    text        check (archive_source in ('active_deleted','triggered_deleted')) not null default 'active_deleted',
  fired_at          timestamptz,
  archived_at       timestamptz not null default now()
);

alter table archived_watchlist_items enable row level security;

create policy "archived_watchlist_select_own"
  on archived_watchlist_items for select
  to authenticated using (auth.uid() = user_id);

create policy "archived_watchlist_insert_own"
  on archived_watchlist_items for insert
  to authenticated with check (auth.uid() = user_id);

create policy "archived_watchlist_delete_own"
  on archived_watchlist_items for delete
  to authenticated using (auth.uid() = user_id);
