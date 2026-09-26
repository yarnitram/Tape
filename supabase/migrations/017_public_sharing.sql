-- Migration 017: Public Shareable Setup Links
-- Adds share_token and is_public columns to watchlist_items and trade_alerts tables.

ALTER TABLE watchlist_items
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

ALTER TABLE trade_alerts
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

ALTER TABLE archived_trade_alerts
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create index for fast public lookup
CREATE INDEX IF NOT EXISTS idx_watchlist_items_share_token ON watchlist_items(share_token) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_trade_alerts_share_token ON trade_alerts(share_token) WHERE is_public = TRUE;
