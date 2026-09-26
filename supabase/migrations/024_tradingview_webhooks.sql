-- Migration 024: TradingView Webhook Integration Secret
-- Adds a unique per-user webhook_secret to user_settings for authenticating external TradingView alerts.

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS webhook_secret TEXT UNIQUE DEFAULT ('tv_sec_' || encode(gen_random_bytes(16), 'hex'));

-- Backfill any existing user_settings rows with a unique secret
UPDATE public.user_settings
SET webhook_secret = ('tv_sec_' || encode(gen_random_bytes(16), 'hex'))
WHERE webhook_secret IS NULL;
