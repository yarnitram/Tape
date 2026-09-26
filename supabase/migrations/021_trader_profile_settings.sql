-- Migration 021: Public Trader Profile Settings

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS twitter_handle text,
  ADD COLUMN IF NOT EXISTS telegram_channel text,
  ADD COLUMN IF NOT EXISTS is_profile_public boolean NOT NULL DEFAULT true;
