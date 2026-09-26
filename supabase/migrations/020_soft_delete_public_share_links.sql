-- Migration 020: Soft Delete Support for Public Share Links

-- 1. Add deleted_at column
ALTER TABLE public_share_links
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Drop existing unique constraint if present
ALTER TABLE public_share_links
  DROP CONSTRAINT IF EXISTS unique_user_slug;

-- 3. Create partial unique index on (user_id, slug) for active links
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_share_links_active_slug
  ON public_share_links (user_id, slug)
  WHERE deleted_at IS NULL;

-- 4. Index for filtering active vs deleted items by user
CREATE INDEX IF NOT EXISTS idx_public_share_links_deleted_at
  ON public_share_links (user_id, deleted_at);

-- 5. Update public access RLS policy to ensure soft-deleted links cannot be viewed by public
DROP POLICY IF EXISTS "Public users can view active share links" ON public_share_links;

CREATE POLICY "Public users can view active share links"
  ON public_share_links FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);
