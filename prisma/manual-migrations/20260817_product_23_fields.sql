-- Idempotent additive migration applied before the matching application deploy.
--
-- PHASE 1 — Product content infrastructure: the 8 genuinely-missing columns
--
-- WHY HAND-WRITTEN SQL (house convention, see 20260814_category_name_rw.sql):
-- This database has NO `_prisma_migrations` table. Every schema change in this
-- project ships as hand-written SQL in this directory. `prisma migrate dev`
-- would read the live schema as drift and offer to reset — which would destroy
-- 137 products, 11 orders and 10 categories. This file reaches the same end
-- state with no reset path.
--
-- WHY ONLY THESE 8 COLUMNS:
-- The Phase 0 audit (2026-08-19, commit eb3b961240c1) found 15 of the 23
-- target fields already exist in schema AND database:
--   ingredients, ingredientsRw, howToUse, howToUseRw, expectedResults,
--   expectedResultsRw, warnings, warningsRw, shortDescription, description,
--   sku, brandId, categoryId, weightGrams (field #23 "weight"), skinType +
--   hairType (partial field #17 "suitableFor").
-- Owner-approved decisions (2026-08-19):
--   * `ingredients` stays as the legacy JSON array — converting it to text
--     would break the admin tag UI, both admin APIs, the public serializer
--     and the product tabs, and risk the 10 rows that already have data.
--   * Field #23 uses the existing `weightGrams Decimal?` — no new column.
--   * `suitableFor` is added as JSONB and merges with skinType/hairType at
--     display time.
--
-- SAFETY:
--   * Additive only: no column dropped, no row touched, no type changed.
--   * Every new column is nullable (uniqueSellingPoints mirrors the existing
--     `allergens` shape: TEXT[] DEFAULT ARRAY[]::text[]). Existing rows keep
--     their exact current values; nothing is backfilled in this phase.
--   * IF NOT EXISTS everywhere: safe to re-run.
--   * Each statement is a single ALTER TABLE ADD COLUMN so a failure cannot
--     half-apply a statement.
--
-- ROLLBACK (see the commented block at the bottom). Only meaningful BEFORE
-- content is imported — after Phase 3 imports data, rolling these columns
-- back would destroy that content. Reversibility is guaranteed by the DROP
-- statements below, applied in reverse order.

-- ─── 1. Bilingual name/description columns ────────────────────────────────
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nameRw" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortDescriptionRw" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "descriptionRw" TEXT;

-- ─── 2. Structured "suitable for" audience info ───────────────────────────
-- Shape: { "skinType": ["oily","dry"], "hairType": ["curly"],
--          "ageRange": "18+", "gender": "unisex" }
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "suitableFor" JSONB;

-- ─── 3. Selling points (postgres array, mirrors `allergens`) ──────────────
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "uniqueSellingPoints" TEXT[] DEFAULT ARRAY[]::text[];

-- ─── 4. SEO keywords and WhatsApp share text ──────────────────────────────
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoKeywords" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoKeywordsRw" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "whatsappShareText" TEXT;

-- ─── Verification (run after execution) ───────────────────────────────────
-- Expected: 8 rows returned, all columns listed, existing counts unchanged.
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'Product'
--    AND column_name IN ('nameRw','shortDescriptionRw','descriptionRw',
--                        'suitableFor','uniqueSellingPoints',
--                        'seoKeywords','seoKeywordsRw','whatsappShareText')
--  ORDER BY column_name;
-- SELECT COUNT(*) FROM "Product";  -- must still be 137 (116 active, 21 deleted)

-- ─── ROLLBACK (reverse order; DESTROYS content imported after this phase) ─
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "whatsappShareText";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "seoKeywordsRw";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "seoKeywords";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "uniqueSellingPoints";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "suitableFor";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "descriptionRw";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "shortDescriptionRw";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "nameRw";
