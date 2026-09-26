-- Migration 018: Dedicated Public Share Links & User Handle/Username

-- 1. Add username to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- 2. Create public_share_links table
CREATE TABLE IF NOT EXISTS public_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  share_type text NOT NULL CHECK (share_type IN ('watchlist', 'trade')),
  symbol text NOT NULL,
  watchlist_item_id uuid REFERENCES watchlist_items(id) ON DELETE SET NULL,
  trade_alert_id uuid REFERENCES trade_alerts(id) ON DELETE SET NULL,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  trigger_direction text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_slug UNIQUE (user_id, slug)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_public_share_links_user_id ON public_share_links(user_id);
CREATE INDEX IF NOT EXISTS idx_public_share_links_user_slug ON public_share_links(user_id, slug);

-- 4. Enable RLS
ALTER TABLE public_share_links ENABLE ROW LEVEL SECURITY;

-- Owner can read, insert, update, delete their own share links
CREATE POLICY "Users can manage their own public share links"
  ON public_share_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Unauthenticated/public users can read active share links
CREATE POLICY "Public users can view active share links"
  ON public_share_links FOR SELECT
  USING (is_active = true);
