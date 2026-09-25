-- ============================================================
-- Migration 014: telegram_and_multi_webhooks
-- Add multi-webhook support for Discord and Telegram destinations
-- ============================================================

alter table public.user_settings
  add column if not exists discord_webhooks jsonb default '[]'::jsonb,
  add column if not exists telegram_destinations jsonb default '[]'::jsonb,
  add column if not exists notify_telegram boolean not null default true;

-- Backfill discord_webhooks array from legacy discord_webhook_url column
update public.user_settings
set discord_webhooks = jsonb_build_array(discord_webhook_url)
where discord_webhook_url is not null
  and (discord_webhooks is null or jsonb_array_length(discord_webhooks) = 0);
