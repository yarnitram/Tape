-- ============================================================
-- 004 — Watchlist refresh interval
-- How often (seconds) the app polls the MEXC futures API for live
-- watchlist prices. Stored per user in user_settings so the
-- watchlist page can honor it. Default is 10s, floor of 3s.
-- ============================================================

alter table public.user_settings
  add column if not exists refresh_interval_sec integer not null default 10
  check (refresh_interval_sec >= 3);

-- Backfill existing rows (should already be 10 via default, but be safe).
update public.user_settings
  set refresh_interval_sec = 10
  where refresh_interval_sec is null;