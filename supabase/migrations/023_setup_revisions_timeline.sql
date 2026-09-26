-- Migration 023: Trade Setup Revision History & Timeline Log

CREATE TABLE IF NOT EXISTS setup_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('watchlist', 'trade', 'share')),
  item_id uuid NOT NULL,
  symbol text NOT NULL,
  revision_type text NOT NULL, -- e.g. 'CREATED', 'SL_ADJUSTED', 'SL_BREAKEVEN', 'TP_ADJUSTED', 'NOTE_UPDATED', 'TRIGGER_FIRED'
  title text NOT NULL,
  description text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by item_id & chronological order
CREATE INDEX IF NOT EXISTS idx_setup_revisions_item_id_created 
  ON setup_revisions (item_id, created_at DESC);

-- Enable RLS
ALTER TABLE setup_revisions ENABLE ROW LEVEL SECURITY;

-- Owner policy
CREATE POLICY "Users can manage own setup revisions"
  ON setup_revisions FOR ALL
  USING (auth.uid() = user_id);

-- Public read policy for setup revisions on shared links
CREATE POLICY "Public read setup revisions"
  ON setup_revisions FOR SELECT
  USING (true);
