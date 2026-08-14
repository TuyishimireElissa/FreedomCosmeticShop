-- Idempotent additive migration applied before the matching application deploy.
--
-- Creates the ten categories the owner asked for, and retires the ghost
-- hair-care row.
--
-- WHY HAND-WRITTEN SQL, NOT `prisma migrate`
--
-- Same reason as 20260814_category_name_rw.sql: this database has no
-- _prisma_migrations table and the repo has no prisma/migrations/ folder.
-- Pointing Prisma Migrate at it would read the whole live schema as drift and
-- offer to reset, destroying 128 products and 11 orders.
--
-- WHAT THIS CREATES
--
-- Ten rows at the sortOrder slots deliberately left free by the previous
-- migration (3, 5, 9-16). Verified before writing: none of these ten slugs
-- exists, and none of those slots is occupied.
--
--   3   soap              Isabune                 <- 33 products move here later
--   5   whitening         Kwera no Kurangaza      <- 20 products move here later
--   9   baby-kids         Abana
--   10  body-oil          Amavuta y'Umubiri
--   11  petroleum-jelly   Vaseline
--   12  hair-growth       Gukura Umusatsi
--   13  natural-organic   Kamere
--   14  nail-care         Ifarasi
--   15  deodorant         Deodorante
--   16  shampoo           Shampoo
--
-- All ten are created isActive = true. Owner decision: visibility is an owner
-- choice made in the admin panel, not a side-effect of stock. Eight of the ten
-- will have zero products on day one and will carry a "Vuba / Soon" badge in
-- the navigation and render a Coming Soon page.
--
-- cuid() is generated in SQL rather than by Prisma because this runs as raw
-- statements. The format matches what Prisma produces closely enough for a
-- 25-character collision-resistant id; the column only requires uniqueness.
--
-- Safe to re-run: every INSERT is guarded by ON CONFLICT (slug) DO NOTHING,
-- so a second run creates nothing and changes nothing.

-- ─── 1. The ten new categories ──────────────────────────────────────────
INSERT INTO "Category" ("id", "name", "nameRw", "slug", "sortOrder", "isActive", "isDeleted", "createdAt", "updatedAt")
VALUES
  ('cat_' || substr(md5(random()::text || 'soap'),            1, 21), 'Soap',                    'Isabune',            'soap',            3,  true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'whitening'),       1, 21), 'Whitening & Brightening', 'Kwera no Kurangaza', 'whitening',       5,  true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'baby-kids'),       1, 21), 'Baby & Kids',             'Abana',              'baby-kids',       9,  true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'body-oil'),        1, 21), 'Body Oil',                'Amavuta y''Umubiri', 'body-oil',        10, true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'petroleum-jelly'), 1, 21), 'Petroleum Jelly',         'Vaseline',           'petroleum-jelly', 11, true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'hair-growth'),     1, 21), 'Hair Growth',             'Gukura Umusatsi',    'hair-growth',     12, true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'natural-organic'), 1, 21), 'Natural & Organic',       'Kamere',             'natural-organic', 13, true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'nail-care'),       1, 21), 'Nail Care',               'Ifarasi',            'nail-care',       14, true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'deodorant'),       1, 21), 'Deodorant',               'Deodorante',         'deodorant',       15, true, false, NOW(), NOW()),
  ('cat_' || substr(md5(random()::text || 'shampoo'),         1, 21), 'Shampoo',                 'Shampoo',            'shampoo',         16, true, false, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- ─── 2. Retire the ghost hair-care row ──────────────────────────────────
-- A duplicate of `haircare` created by an early slugify pass. It holds zero
-- products and is already isDeleted.
--
-- It was ALREADY isActive = false before this ran — verified first. The
-- statement still reports "1 row", because Postgres counts rows MATCHED by
-- the WHERE clause, not rows whose value actually changed. I predicted 0 and
-- was wrong about the reporting, not the outcome: the end state is identical
-- either way, which is what makes the statement safe to replay.
--
-- It stays in the file because the migration must be self-contained: anyone
-- replaying it against a fresh restore needs the row retired.
--
-- The slug is spelled with a hyphen. `haircare` (no hyphen, 12 products,
-- sortOrder 6) is a DIFFERENT row and must not be touched.
UPDATE "Category"
SET "isActive" = false
WHERE "slug" = 'hair-care';
