-- Migration 019: Multi-Token Support for Public Share Links

ALTER TABLE public_share_links
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
