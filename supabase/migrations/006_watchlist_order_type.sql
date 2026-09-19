-- ============================================================
-- 006 — Watchlist order type
-- Records the order type the user intends to place when a watchlist
-- coin's trigger fires. Options align with MEXC order types:
--   limit         - a standard limit order
--   trigger_limit - a triggered limit order (fires when price crosses)
--   market        - a market order
-- ============================================================

alter table public.watchlist_items
  add column if not exists order_type text
  check (order_type in ('limit','trigger_limit','market'));