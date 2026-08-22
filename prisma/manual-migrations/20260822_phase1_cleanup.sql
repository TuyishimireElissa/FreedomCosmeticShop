-- Phase 1 technical cleanup — owner-approved 2026-08-22.
--
-- WHY HAND-WRITTEN SQL AND NOT `prisma migrate dev`
--
-- This database has no `_prisma_migrations` table and the repo has no
-- prisma/migrations/ folder — every schema change here has been hand-written
-- SQL in this directory. Pointing `migrate dev` at an untracked database makes
-- it read the entire live schema as drift and offer to reset, which would
-- destroy 108 products two days after the last database was lost.
--
-- This migration touches DATA only. No column is added, dropped or retyped.
-- Every statement is idempotent and safe to re-run.
--
-- ─── 1. SKU for Movit Blow Out Creme Hair Relaxer ────────────────────────
--
-- The only active product without a SKU. Verified before writing:
--   * Product.sku is currently NULL for this slug
--   * no other row already uses 'MOVIT-BLOWOUT-RELAXER' (sku is @unique, so a
--     collision would abort the statement rather than corrupt anything)
-- Guarded on `sku IS NULL` so a later manual edit is never overwritten.

UPDATE "Product"
SET "sku" = 'MOVIT-BLOWOUT-RELAXER'
WHERE "slug" = 'movit-blow-out-creme-hair-relaxer-150g'
  AND "sku" IS NULL;

-- ─── 2. Kinyarwanda category names ───────────────────────────────────────
--
-- Six categories had NULL nameRw and were falling back to English in the
-- Kinyarwanda UI. Values supplied by the owner. Each UPDATE is keyed by slug
-- and guarded on IS NULL, so it cannot touch an unrelated row and cannot
-- overwrite a name someone later edits in the admin panel.

UPDATE "Category" SET "nameRw" = 'Imibavu'                 WHERE "slug" = 'fragrance'     AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Kwita ku musatsi'        WHERE "slug" = 'haircare'      AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Kwita ku ruhu'           WHERE "slug" = 'skincare'      AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Kwita ku mubiri'         WHERE "slug" = 'body-care'     AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Ibikoresho byo kwisiga'  WHERE "slug" = 'makeup'        AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Ibikoresho by''abagabo'  WHERE "slug" = 'mens-grooming' AND "nameRw" IS NULL;

-- ─── 3. Deactivate the duplicate 'hair-care' category ────────────────────
--
-- 'haircare' (8 live products) and 'hair-care' (0 products) both existed and
-- both showed in the category navigation, so shoppers could land on an empty
-- shelf. Verified `hair-care` holds ZERO active products before deactivating,
-- so nothing is orphaned.
--
-- isActive = false, NOT deleted and NOT dropped: the row stays, so this is a
-- one-line reversal if it turns out to be wanted. sortOrder is parked at 99 so
-- it can never lead the navigation if something reactivates it by accident.

UPDATE "Category"
SET "isActive" = false, "sortOrder" = 99
WHERE "slug" = 'hair-care';

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
-- Run these to undo this migration exactly. Kept as a comment so it can never
-- execute by accident.
--
-- UPDATE "Product"  SET "sku" = NULL WHERE "slug" = 'movit-blow-out-creme-hair-relaxer-150g';
-- UPDATE "Category" SET "nameRw" = NULL WHERE "slug" IN
--   ('fragrance','haircare','skincare','body-care','makeup','mens-grooming');
-- UPDATE "Category" SET "isActive" = true, "sortOrder" = 0 WHERE "slug" = 'hair-care';
