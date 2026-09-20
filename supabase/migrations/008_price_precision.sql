-- ============================================================
-- 008 — Price precision
-- The plan/price columns were numeric(14,4), which made Postgres round
-- values like 0.003326 down to 0.0033 on save. Widen the scale to 7
-- decimals (and raise precision to 18 so large caps still fit).
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
-- ============================================================

alter table public.watchlist_items
  alter column alert_price type numeric(18,7),
  alter column trigger_price type numeric(18,7),
  alter column entry_price type numeric(18,7),
  alter column stop_loss type numeric(18,7),
  alter column take_profit type numeric(18,7);
