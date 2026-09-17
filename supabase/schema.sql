-- ============================================================
-- Tape — Personal Trading Journal
-- Supabase / Postgres schema
--
-- Run this in the Supabase SQL editor (or via migrations).
-- Every table is gated behind Row Level Security scoped to auth.uid().
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- Accounts: supports multiple brokers/accounts even though v1 is single-user
-- ------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  broker text,
  starting_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  created_at timestamptz default now()
);

-- Trades: the core table
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts not null,
  symbol text not null,
  direction text not null check (direction in ('long','short')),
  entry_price numeric(14,4) not null,
  exit_price numeric(14,4),              -- null while position is open
  size numeric(14,4) not null,
  stop_price numeric(14,4),              -- required for a meaningful R-multiple
  fees numeric(10,2) not null default 0,
  entry_time timestamptz not null,
  exit_time timestamptz,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz default now()
);
-- pnl_dollars, pnl_pct, r_multiple are COMPUTED in application code.

-- Tags
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  category text check (category in ('strategy','setup','mistake','emotion')),
  unique(user_id, name)
);

create table if not exists trade_tags (
  trade_id uuid references trades on delete cascade,
  tag_id uuid references tags on delete cascade,
  primary key (trade_id, tag_id)
);

-- Notes + screenshot reference (screenshot itself lives in Supabase Storage)
create table if not exists trade_notes (
  trade_id uuid primary key references trades on delete cascade,
  pre_trade_thesis text,
  post_trade_review text,
  discipline_score smallint check (discipline_score between 1 and 5),
  screenshot_url text
);

-- Risk settings per account
create table if not exists risk_settings (
  account_id uuid primary key references accounts on delete cascade,
  max_daily_loss numeric(14,2),
  max_position_risk_pct numeric(5,2),
  max_open_positions smallint
);

-- Watchlist
create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  symbol text not null,
  notes text,
  alert_price numeric(14,4),
  added_at timestamptz default now()
);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table accounts enable row level security;
alter table trades enable row level security;
alter table tags enable row level security;
alter table trade_tags enable row level security;
alter table trade_notes enable row level security;
alter table risk_settings enable row level security;
alter table watchlist_items enable row level security;

-- Owner-scoped policies. A row belongs to the user when:
--   accounts.user_id = auth.uid()
--   trades.account.author is auth.uid()
--   tags.user_id = auth.uid()
--   trade_tags through tags / trades ownership
--   trade_notes through trades
--   risk_settings through accounts
--   watchlist_items.user_id = auth.uid()

-- ACCOUNTS
create policy "accounts_select_own" on accounts
  for select to authenticated using (auth.uid() = user_id);
create policy "accounts_insert_own" on accounts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "accounts_update_own" on accounts
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "accounts_delete_own" on accounts
  for delete to authenticated using (auth.uid() = user_id);

-- TRADES (owner is resolved through the account)
create policy "trades_select_own" on trades
  for select to authenticated
  using (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ));
create policy "trades_insert_own" on trades
  for insert to authenticated
  with check (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ));
create policy "trades_update_own" on trades
  for update to authenticated
  using (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ));
create policy "trades_delete_own" on trades
  for delete to authenticated
  using (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ));

-- TAGS
create policy "tags_select_own" on tags
  for select to authenticated using (auth.uid() = user_id);
create policy "tags_insert_own" on tags
  for insert to authenticated with check (auth.uid() = user_id);
create policy "tags_update_own" on tags
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "tags_delete_own" on tags
  for delete to authenticated using (auth.uid() = user_id);

-- TRADE_TAGS
create policy "trade_tags_select_own" on trade_tags
  for select to authenticated
  using (exists (
    select 1 from tags t where t.id = tag_id and t.user_id = auth.uid()
  ));
create policy "trade_tags_insert_own" on trade_tags
  for insert to authenticated
  with check (exists (
    select 1 from tags t where t.id = tag_id and t.user_id = auth.uid()
  ));
create policy "trade_tags_delete_own" on trade_tags
  for delete to authenticated
  using (exists (
    select 1 from tags t where t.id = tag_id and t.user_id = auth.uid()
  ));

-- TRADE_NOTES
create policy "notes_select_own" on trade_notes
  for select to authenticated
  using (exists (
    select 1 from trades tr
    join accounts a on a.id = tr.account_id
    where tr.id = trade_id and a.user_id = auth.uid()
  ));
create policy "notes_insert_own" on trade_notes
  for insert to authenticated
  with check (exists (
    select 1 from trades tr
    join accounts a on a.id = tr.account_id
    where tr.id = trade_id and a.user_id = auth.uid()
  ));
create policy "notes_update_own" on trade_notes
  for update to authenticated
  using (exists (
    select 1 from trades tr
    join accounts a on a.id = tr.account_id
    where tr.id = trade_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from trades tr
    join accounts a on a.id = tr.account_id
    where tr.id = trade_id and a.user_id = auth.uid()
  ));
create policy "notes_delete_own" on trade_notes
  for delete to authenticated
  using (exists (
    select 1 from trades tr
    join accounts a on a.id = tr.account_id
    where tr.id = trade_id and a.user_id = auth.uid()
  ));

-- RISK_SETTINGS
create policy "risk_settings_select_own" on risk_settings
  for select to authenticated
  using (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ));
create policy "risk_settings_upsert_own" on risk_settings
  for insert to authenticated
  with check (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ));
create policy "risk_settings_update_own" on risk_settings
  for update to authenticated
  using (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from accounts a
    where a.id = account_id and a.user_id = auth.uid()
  ));

-- WATCHLIST
create policy "watchlist_select_own" on watchlist_items
  for select to authenticated using (auth.uid() = user_id);
create policy "watchlist_insert_own" on watchlist_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "watchlist_update_own" on watchlist_items
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "watchlist_delete_own" on watchlist_items
  for delete to authenticated using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Storage bucket for trade screenshots
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', true)
on conflict (id) do nothing;

-- Public read for screenshots (they're keyed to the user's own trades anyway).
create policy "screenshots_public_read"
  on storage.objects for select
  using (bucket_id = 'trade-screenshots');

create policy "screenshots_owner_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'trade-screenshots');