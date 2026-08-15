-- Dabur Herbolene Aloe Jelly: put the size in the name, like the Veet oils.
--
-- Two real sizes shared one name, so a shopper saw the same product twice at
-- 3,500 and 5,800 RWF with no way to tell them apart in a grid. Identical
-- defect to the three "Veet Gold Turmeric Super Whitening Oil" rows, where the
-- owner chose to rename rather than hide (Fix 2, Option A). Same precedent
-- applied here.
--
-- Also repairs two data-entry faults on the 225 ml row:
--   volume ": 225 ml" -> "225 ml"   (stray leading colon and space)
--   size   NULL       -> "225 ml"   (the 425 ml row already had both set)
--
-- Both rows had zero orders, zero carts and zero wishlist entries at the time
-- of writing, so no customer reference could be disturbed. Prices, stock,
-- slugs, SKUs, images, descriptions and category are all untouched — slugs
-- especially, so existing product URLs keep working.

UPDATE "Product"
SET    "name"   = 'Dabur Herbolene Aloe Jelly 225ml',
       "size"   = '225 ml',
       "volume" = '225 ml'
WHERE  "id"     = 'cmsd6fm1200018s02lqneuspg'
  AND  "name"   = 'Dabur Herbolene Aloe Jelly';

UPDATE "Product"
SET    "name"   = 'Dabur Herbolene Aloe Jelly 425ml'
WHERE  "id"     = 'cmsd9o6u70004r3jbyum8i348'
  AND  "name"   = 'Dabur Herbolene Aloe Jelly';

-- Idempotent: the AND on the old name makes a re-run a no-op.
--
-- Verify:
--   SELECT name, price, size, volume, slug FROM "Product"
--   WHERE id IN ('cmsd6fm1200018s02lqneuspg','cmsd9o6u70004r3jbyum8i348');
-- Expected: ...225ml | 3500 | 225 ml | 225 ml | dabur-herbolene-aloe-jelly
--           ...425ml | 5800 | 425 ml | 425 ml | dabur-herbolene-aloe-jelly-1
--
-- No duplicate product names remain among the 107 live products after this.
