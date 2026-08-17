-- Search history for signed-in shoppers.
--
-- WHY HAND-WRITTEN. This database has no _prisma_migrations table and the repo
-- has no prisma/migrations/ folder, so `prisma migrate dev` would read the
-- entire live schema as drift and offer to RESET — destroying 132 products,
-- 11 orders and 8 users. Every schema change here is applied as SQL and the
-- client regenerated with `prisma generate`.
--
-- WHY THIS TABLE STORES READABLE TEXT WHEN SearchLog DOES NOT.
-- SearchLog is anonymous analytics: it cannot know who typed a query, so the
-- text is HMAC-hashed and unrecoverable. This table is the authenticated case
-- — the row belongs to the shopper who created it, and it exists so they can
-- tap a past search again. A hash would make the feature impossible. It is
-- consistent with Wishlist, Order and ActivityLog, which already key on userId.
--
-- Additive only. Creates one table, adds no column to an existing one, and
-- touches no existing row. Safe to re-run: every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "UserSearchHistory" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "query"      TEXT         NOT NULL,
  "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserSearchHistory_pkey" PRIMARY KEY ("id")
);

-- Deleting an account must take its search history with it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserSearchHistory_userId_fkey'
  ) THEN
    ALTER TABLE "UserSearchHistory"
      ADD CONSTRAINT "UserSearchHistory_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- One row per distinct query per user. Re-searching the same phrase updates
-- searchedAt rather than appending a duplicate, which is what makes the
-- upsert in POST /api/user/search-history a single statement.
CREATE UNIQUE INDEX IF NOT EXISTS "UserSearchHistory_userId_query_key"
  ON "UserSearchHistory" ("userId", "query");

-- Serves the only read this table has: one user's rows, newest first.
CREATE INDEX IF NOT EXISTS "UserSearchHistory_userId_searchedAt_idx"
  ON "UserSearchHistory" ("userId", "searchedAt" DESC);

ANALYZE "UserSearchHistory";

-- Verify:
--   SELECT COUNT(*) FROM "UserSearchHistory";                        -- 0 on a fresh apply
--   SELECT indexname FROM pg_indexes WHERE tablename='UserSearchHistory';
-- Expected: pkey, userId_query_key, userId_searchedAt_idx
