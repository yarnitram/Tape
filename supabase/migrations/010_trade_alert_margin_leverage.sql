-- ============================================================
-- 010 — Trade alert margin & leverage
-- The /trades page sizes a position from its margin and leverage so
-- it can show Position, Unrealized P&L and Margin next to the live
-- MEXC price. Both columns are optional: NULL means "use the page
-- default" ($1 margin, and the contract's max leverage from MEXC),
-- so nothing needs backfilling and "max leverage" stays correct even
-- if the exchange raises a coin's ceiling later.
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
-- ============================================================

-- Position margin in USD.
alter table public.trade_alerts
  add column if not exists margin_usd numeric(18,2);

-- Leverage used for the position (e.g. 50 = 50x).
alter table public.trade_alerts
  add column if not exists leverage numeric(18,2);
