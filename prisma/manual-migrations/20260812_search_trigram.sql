-- Idempotent additive migration applied before the matching application deploy.
--
-- Search was taking 17.1 SECONDS measured from Vercel, in the same region as
-- the database (three consecutive runs: 17.5s, 17.1s, 17.1s for q=uruhu).
--
-- Cause: the Kinyarwanda vocabulary expands one word into up to 40 terms, each
-- matched with `ILIKE %term%` across 16 text fields — up to 640 OR clauses in
-- a single Prisma query. No `%term%` pattern can use a btree index, and the
-- Product table carried no text index at all: all 15 existing indexes were on
-- ids, price, dates and booleans.
--
-- pg_trgm gives GIN indexes that DO accelerate substring and similarity
-- matching, and provides similarity() for relevance ranking.
--
-- Safe to re-run. Additive only: no column is added, altered or dropped, and
-- no row is touched. Building these on 124 products took under 400ms each.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ranking and name matching. lower() matches the query's own lower() so the
-- planner can actually use the index rather than recomputing per row.
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN (lower("name") gin_trgm_ops);

-- COALESCE because the column is nullable; without it NULL rows are excluded
-- from the index and silently stop matching.
CREATE INDEX IF NOT EXISTS "Product_shortDescription_trgm_idx"
  ON "Product" USING GIN (lower(COALESCE("shortDescription", '')) gin_trgm_ops);

-- Brand and category names are searched through joins on every query.
CREATE INDEX IF NOT EXISTS "Brand_name_trgm_idx"
  ON "Brand" USING GIN (lower("name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Category_name_trgm_idx"
  ON "Category" USING GIN (lower("name") gin_trgm_ops);

-- Refresh planner statistics so the new indexes are costed correctly on the
-- first query rather than after autovacuum eventually notices them.
ANALYZE "Product";
ANALYZE "Brand";
ANALYZE "Category";
