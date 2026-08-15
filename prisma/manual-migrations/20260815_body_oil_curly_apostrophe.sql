-- Body Oil: straight apostrophe -> U+2019 curly, to match the i18n file.
--
-- categoryLabel() resolves nameRw BEFORE the i18n key, so the database value is
-- what a Kinyarwanda shopper actually sees. src/lib/i18n/translations/rw.ts
-- ships `body_oil: 'Amavuta y’Umubiri'` with a curly U+2019, but the row
-- created by 20260814_new_categories.sql used an ASCII straight quote. The
-- curly i18n value was therefore dead code for this category, and the owner's
-- own mobile test plan asked for U+2019 specifically.
--
-- mens-grooming is deliberately NOT changed: its i18n key also uses a straight
-- quote, so database and i18n already agree there. Changing one and not the
-- other is the point — this fixes a mismatch, it does not impose a house style.
--
-- Touches one column on one row. Idempotent: re-running is a no-op because the
-- WHERE clause stops matching once applied.
UPDATE "Category"
SET    "nameRw" = 'Amavuta y' || U&'\2019' || 'Umubiri'
WHERE  "slug"   = 'body-oil'
  AND  "nameRw" IS DISTINCT FROM ('Amavuta y' || U&'\2019' || 'Umubiri');

-- Verify:
--   SELECT slug, "nameRw", ascii(substring("nameRw" from 10 for 1)) AS apostrophe_codepoint
--   FROM "Category" WHERE slug = 'body-oil';
-- Expected: Amavuta y’Umubiri | 8217   (8217 = 0x2019)
