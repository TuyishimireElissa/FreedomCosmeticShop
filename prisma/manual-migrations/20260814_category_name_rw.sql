-- Idempotent additive migration applied before the matching application deploy.
--
-- WHY THIS IS HAND-WRITTEN SQL AND NOT `prisma migrate dev`
--
-- The brief specified `prisma migrate dev --name add_category_name_rw`. I did
-- not run it. This database has NO `_prisma_migrations` table (verified:
-- information_schema reports it absent) and the repo has no
-- prisma/migrations/ folder — every schema change in this project has been
-- hand-written SQL in this directory.
--
-- Pointing `migrate dev` at a database Prisma has never tracked makes it read
-- the entire live schema as drift and offer to reset. That would destroy 127
-- products, 11 orders and 7 categories. The end state below is identical and
-- carries no reset path.
--
-- WHAT THIS DOES
--
-- 1. Adds Category."nameRw" — the Kinyarwanda display name.
--
--    Kinyarwanda for categories previously lived only in
--    src/lib/i18n/translations/rw.ts, keyed by slug. That means the owner
--    cannot rename a category in Kinyarwanda without a developer and a
--    deploy. Owner decision 2026-08-14: store it on the row so the admin
--    panel can edit it.
--
--    Nullable on purpose. A NOT NULL column would need a default, and a
--    wrong default is worse than an empty one — the UI falls back to the
--    i18n key and then to the English name, so a null renders correctly
--    today and improves the moment it is filled.
--
-- 2. Backfills nameRw for the 7 existing rows from the reviewed rw.ts
--    strings. These are the exact values already shipping to customers, so
--    this changes storage, not what anyone reads.
--
-- 3. Renumbers sortOrder into the owner's agreed sequence. The old numbers
--    collided with the categories added in a later phase (hair-care 4,
--    fragrance 5, body-care 6, mens-grooming 7 all sat in slots the new
--    the new categories need). Renumbering now means the later insert needs no
--    reshuffle.
--
-- Safe to re-run. Additive only: no column is dropped, no row is deleted,
-- and every UPDATE is keyed by slug so it cannot touch an unrelated row.

-- ─── 1. The column ──────────────────────────────────────────────────────
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameRw" TEXT;

-- ─── 2. Backfill from the reviewed rw.ts values ─────────────────────────
-- Only fills where it is still NULL, so a later admin edit is never
-- overwritten by a re-run.
UPDATE "Category" SET "nameRw" = 'Kwita ku ruhu'            WHERE "slug" = 'skincare'      AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Ibikoresho byo kwisiga'   WHERE "slug" = 'makeup'        AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Kwita ku musatsi'         WHERE "slug" = 'haircare'      AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Kwita ku musatsi'         WHERE "slug" = 'hair-care'     AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Imibavu'                  WHERE "slug" = 'fragrance'     AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Kwita ku mubiri'          WHERE "slug" = 'body-care'     AND "nameRw" IS NULL;
UPDATE "Category" SET "nameRw" = 'Ibikoresho by''abagabo'   WHERE "slug" = 'mens-grooming' AND "nameRw" IS NULL;

-- ─── 3. Renumber sortOrder to the agreed sequence ───────────────────────
-- Only the 7 slugs that exist today. The remaining slots (3, 5, 9-16) are
-- left free for the categories created in a later phase.
UPDATE "Category" SET "sortOrder" = 1 WHERE "slug" = 'skincare';
UPDATE "Category" SET "sortOrder" = 2 WHERE "slug" = 'body-care';
UPDATE "Category" SET "sortOrder" = 4 WHERE "slug" = 'fragrance';
UPDATE "Category" SET "sortOrder" = 6 WHERE "slug" = 'haircare';
UPDATE "Category" SET "sortOrder" = 7 WHERE "slug" = 'makeup';
UPDATE "Category" SET "sortOrder" = 8 WHERE "slug" = 'mens-grooming';

-- The ghost duplicate. It is already isDeleted, and a later phase sets
-- isActive = false on it. Parked at 99 so it can never lead the nav if
-- anything ever reactivates it by accident.
UPDATE "Category" SET "sortOrder" = 99 WHERE "slug" = 'hair-care';
