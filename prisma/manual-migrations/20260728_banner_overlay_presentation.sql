-- Idempotent additive migration applied before the matching application deploy.
-- Adds optional overlay presentation columns used by the promotional carousel.
-- Existing rows keep NULL; the UI falls back to "left" / "light".
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "textPosition" TEXT;
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "textColor" TEXT;

-- Supports the public carousel query: placement + isActive filtered, ordered by sortOrder.
CREATE INDEX IF NOT EXISTS "Banner_placement_isActive_sortOrder_idx"
  ON "Banner"("placement", "isActive", "sortOrder");
