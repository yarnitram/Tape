-- Migration 022: Web Audio Price Proximity Alarm Settings

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS proximity_alarm_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS proximity_threshold_pct numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS alarm_sound_preset text NOT NULL DEFAULT 'radar_ping';
