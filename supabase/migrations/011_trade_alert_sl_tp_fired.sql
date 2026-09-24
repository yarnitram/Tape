-- ============================================================
-- 011 — Trade alert SL / TP hit tracking
-- A trade plan carries a stop-loss and a take-profit. Once the live
-- price crosses either level we notify the user and log a journal
-- entry — but each level must fire AT MOST ONCE per row, so the
-- crossing isn't re-detected on every poll.
--
-- These two timestamps mirror the existing alert_fired / alert_fired_at
-- pattern on watchlist_items: NULL means "this level has not been hit
-- yet". A level stops firing once its timestamp is set.
--
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
-- ============================================================

alter table public.trade_alerts
  add column if not exists sl_fired_at timestamptz;

alter table public.trade_alerts
  add column if not exists tp_fired_at timestamptz;
