# Product content infrastructure — Phase 0 audit (read only)

Audited against `prisma/schema.prisma`, the live database, and the live site on
2026-08-18. No code written. No files changed.

---

## Headline

**14 of the 23 fields already exist as database columns. Only 6 are genuinely
missing.** The brief's Phase 1 list would add 8 columns that are already there,
and `ALTER TABLE ... ADD COLUMN` on an existing column errors without
`IF NOT EXISTS`.

More important: **the display layer already reads every bilingual field**,
including RW-with-EN-fallback logic that the brief's Phase 5 proposes to build.
`ProductTabs.tsx` does this today.

And the single biggest data finding: **`usageInstructions` is populated on
116/116 products** with real usage text averaging 163 characters. The brief
says "111 products missing howToUse". The *column* `howToUse` is empty, but the
*content* exists in a sibling column and is already rendered.

---

## SECTION 1 — Current Product schema

`prisma/schema.prisma:269–348`. Fields relevant to the 23 targets:

| Field | Type | Null | Default | Line |
|---|---|---|---|---|
| `name` | String | required | — | 271 |
| `slug` | String @unique | required | — | 272 |
| `description` | String | required | — | 273 |
| `shortDescription` | String? | nullable | — | 274 |
| `sku` | String? @unique | nullable | — | 285 |
| `realSku` | String? @unique | nullable | — | 287 |
| `barcode` | String? | nullable | — | 288 |
| `volume` / `volumeMl` | String? / Decimal? | nullable | — | 299–300 |
| **`weightGrams`** | **Decimal?** | nullable | — | 301 |
| `skinType` | String? (JSON) | nullable | — | 310 |
| `shades` | String? (JSON) | nullable | — | 313 |
| `ingredients` | String? (JSON) | nullable | — | 316 |
| **`ingredientsRw`** | **String? @db.Text** | nullable | — | 317 |
| `size` | String? | nullable | — | 319 |
| `usageInstructions` | String? | nullable | — | 321 |
| **`howToUse`** | **String? @db.Text** | nullable | — | 322 |
| **`howToUseRw`** | **String? @db.Text** | nullable | — | 323 |
| `warnings` | String? | nullable | — | 325 |
| **`warningsRw`** | **String? @db.Text** | nullable | — | 326 |
| `allergens` | String[] | — | `[]` | 327 |
| `hairType` | HairType? | nullable | — | 330 |
| `fragranceNotes` | Json? | nullable | — | 334 |
| **`expectedResults`** | **String? @db.Text** | nullable | — | 337 |
| **`expectedResultsRw`** | **String? @db.Text** | nullable | — | 338 |
| `resultsTimeframe` | String? | nullable | — | 339 |
| `categoryId` → `category` | relation | required | — | 369–370 |
| `brandId` → `brand` | relation | nullable | — | 372–373 |

Bold = fields the brief lists as missing that **already exist**.

---

## SECTION 2 — Gap analysis

| # | Target | Current column | Status |
|---|---|---|---|
| 1 | name | `name` | ✅ exists |
| 2 | nameRw | — | ❌ **missing** |
| 3 | brand | `brandId` → Brand | ✅ exists (relation) |
| 4 | category | `categoryId` → Category | ✅ exists (relation) |
| 5 | shortDescription | `shortDescription` | ✅ exists |
| 6 | shortDescriptionRw | — | ❌ **missing** |
| 7 | description | `description` | ✅ exists |
| 8 | descriptionRw | — | ❌ **missing** |
| 9 | ingredients | `ingredients` | ⚠️ exists, **JSON string not text** |
| 10 | ingredientsRw | `ingredientsRw` | ✅ exists |
| 11 | howToUse | `howToUse` + `usageInstructions` | ⚠️ **two columns, data in the other one** |
| 12 | howToUseRw | `howToUseRw` | ✅ exists |
| 13 | expectedResults | `expectedResults` | ✅ exists |
| 14 | expectedResultsRw | `expectedResultsRw` | ✅ exists |
| 15 | warnings | `warnings` | ✅ exists |
| 16 | warningsRw | `warningsRw` | ✅ exists |
| 17 | suitableFor | `skinType`+`hairType`+`allergens` | ⚠️ partial, no unified JSON |
| 18 | uniqueSellingPoints | — | ❌ **missing** |
| 19 | seoKeywords | — | ❌ **missing** |
| 20 | seoKeywordsRw | — | ❌ **missing** |
| 21 | whatsappShareText | — | ❌ **missing** |
| 22 | sku | `sku` (+`realSku`) | ✅ exists |
| 23 | weight | `weightGrams` Decimal? | ✅ exists (**brief proposes `Int`**) |

**Totals: 14 ✅ · 3 ⚠️ · 6 ❌**

### Genuinely missing (6)
`nameRw` · `shortDescriptionRw` · `descriptionRw` · `uniqueSellingPoints` ·
`seoKeywords` / `seoKeywordsRw` · `whatsappShareText`

### Brief would wrongly re-add (8)
`ingredientsRw` `howToUse` `howToUseRw` `expectedResults` `expectedResultsRw`
`warningsRw` `weight` (as `weightGrams`) and `ingredients`.

---

## SECTION 3 — Data completeness (live DB)

**Total 137 · Active+not-deleted 116 · Deleted 21 · Inactive 21**

Note: the brief says "111+ products". The live figure is **116**.

| Column | Filled | % | |
|---|---|---|---|
| name / slug / description / shortDescription | 116/116 | 100% | ✅ |
| sku | 116/116 | 100% | ✅ |
| **usageInstructions** | **116/116** | **100%** | ✅ |
| warnings | 115/116 | 99.1% | ⚠️ |
| volume | 111/116 | 95.7% | ⚠️ |
| size | 107/116 | 92.2% | ⚠️ |
| skinType | 31/116 | 26.7% | ⚠️ |
| ingredients | 10/116 | 8.6% | ⚠️ |
| brandId | 2/116 | 1.7% | ❌ |
| realSku | 1/116 | 0.9% | ❌ |
| shades | 1/116 | 0.9% | ❌ |
| **howToUse** | **0/116** | **0%** | ❌ |
| ingredientsRw / howToUseRw / warningsRw | 0/116 | 0% | ❌ |
| expectedResults / expectedResultsRw | 0/116 | 0% | ❌ |
| barcode / weightGrams / volumeMl | 0/116 | 0% | ❌ |
| allergens / hairType / fragranceNotes | 0/116 | 0% | ❌ |
| countryOfOrigin / authenticityInfo / resultsTimeframe | 0/116 | 0% | ❌ |

**Categories: 16/16 have `nameRw` (100%)** — the pattern the brief asks about
works and is proven.

### The `howToUse` / `usageInstructions` split

`usageInstructions` holds real content on **every** product, avg 163 chars:

> "Take a small quantity on fingertips and apply to skin with gentle massage."

`howToUse` is empty. `ProductTabs.tsx:37` already falls back
`howToUseRw → howToUse → usageInstructions`, so customers see this text today.
**The brief's "111 products missing howToUse" is technically true of the column
and materially false about the site.** A migration should consider backfilling
`howToUse` from `usageInstructions`.

### `ingredients` is a JSON array, not text

Values look like `["Alcohol Denat., Butane, ..."]`. The brief's Phase 1 wants
`ingredients String? @db.Text`. **Changing the type would break
`JSON.parse(p.ingredients)` at `api/admin/products/route.ts:86` and `:202`**,
and violates rule "do NOT change types of existing columns".

---

## SECTION 4 — Admin UI

- `src/components/admin/AdminProductManager.tsx` — the only create/edit form
- `src/components/admin/AdminProductImageManager.tsx` — images
- Page: `src/app/admin/products/` (tab-based, `AdminSidebar.tsx:58`)

**Editable today:** name, description, shortDescription, price, wholesalePrice,
compareAt, costPrice, stock, lowStockThreshold, sku, realSku, supplier, dates,
batchNumber, volume, size, brandId, categoryId, images, skinType, shades,
ingredients, usageInstructions, warnings, featured, isActive.

**Not editable:** all 6 missing fields, plus existing-but-unexposed
`howToUse`, `howToUseRw`, `ingredientsRw`, `warningsRw`, `expectedResults`,
`expectedResultsRw`, `weightGrams`, `barcode`, `allergens`, `hairType`,
`countryOfOrigin`.

---

## SECTION 5 — Admin API

- `src/app/api/admin/products/route.ts` — GET, POST
- `src/app/api/admin/products/[id]/route.ts` — GET, PUT, DELETE
- Validation: **`src/lib/admin-product-schema.ts`** (not
  `src/lib/validations/product.ts` as the brief states — that path does not
  exist)

POST/PUT accept 29 fields (schema lines 4–31).

**⚠️ Blocking detail: the Zod schema ends with `.strict()` (line 32).** Unknown
keys are rejected outright, so a bulk import posting new fields returns 400
until the schema is extended. Any Phase 2/3 work must handle this first.

---

## SECTION 6 — Product display

`src/components/products/ProductTabs.tsx` already renders, with RW→EN fallback:

| Tab | Fields | Line |
|---|---|---|
| Description | description, skinType, hairType, volume, fragranceNotes | 48 |
| Ingredients | ingredientsRw → ingredients, allergens | 42, 51 |
| How to use | howToUseRw → howToUse → usageInstructions, warnings, PAO | 35–38, 54 |
| Results | expectedResultsRw → expectedResults, resultsTimeframe | 39–41, 57 |
| Authenticity / Reviews / Delivery | — | 60–62 |

Tabs are **conditionally rendered only when data exists** — precisely the
"hide gracefully" behaviour Phase 5 proposes to build. **It already works.**

`PUBLIC_PRODUCT_SELECT` (`src/lib/public-product.ts:9–78`) already exposes all
bilingual fields to the public API.

JSON-LD (`structured-data.ts`, shipped last engagement): name, description,
image, sku, mpn, size, brand, offers (price/RWF/availability/shipping/returns).

---

## SECTION 7 — i18n

- `src/lib/i18n/LanguageContext.tsx` — `useLanguage()`, localStorage key
  `fcs_language`, no page reload
- UI strings: `src/lib/i18n/translations/{rw,en}.ts`
- **DB-column pattern proven**: `Category.nameRw`, 16/16 filled, added by
  `prisma/manual-migrations/20260814_category_name_rw.sql`
- `ProductImage.altTextRw` uses the same pattern

**Yes — the pattern is directly reusable for products.**

---

## SECTION 8 — Missing content priority

| Rank | Gap | Count | Why it matters |
|---|---|---|---|
| 1 | `brandId` | 114/116 | **Blocks Google Product rich results** |
| 2 | `nameRw` | 116/116 | Primary language, column doesn't exist |
| 3 | descriptionRw / shortDescriptionRw | 116/116 | Primary language |
| 4 | expectedResults | 116/116 | Column exists, unused |
| 5 | ingredients | 106/116 | Cosmetics buyers check this |
| 6 | RW variants of existing text | 116/116 | Columns exist, unused |
| 7 | weightGrams | 116/116 | Needed for Merchant Center |
| 8 | barcode/GTIN | 116/116 | Strongest Google match signal |

---

## SECTION 9 — SEO impact

Metadata (`products/[slug]/page.tsx:50–61`) already emits title, bilingual
description, canonical, OG, Twitter. **`keywords` currently comes from a global
list**, not per-product — `seoKeywords` would improve it, though Google ignores
the keywords meta tag.

**For Google Shopping the true blockers are `brand` (2/116), `gtin` (0/116),
and `weightGrams` (0/116) — all data problems, not schema problems.** Adding
columns will not move this; filling them will.

---

## SECTION 10 — Files to modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | +6 columns only |
| `prisma/manual-migrations/20260818_product_content_fields.sql` | new |
| `src/lib/admin-product-schema.ts` | extend both schemas (mind `.strict()`) |
| `src/app/api/admin/products/route.ts` | POST/GET |
| `src/app/api/admin/products/[id]/route.ts` | PUT |
| `src/lib/public-product.ts` | add 6 to select |
| `src/components/products/ProductTabs.tsx` | USPs, suitableFor |
| `src/lib/structured-data.ts` | weight, audience |
| `src/components/admin/ProductBulkImport.tsx` | new |
| `src/app/admin/products/import/page.tsx` | new |
| `src/app/api/admin/products/bulk-import/route.ts` | new |
| Content dashboard + prompt generator | new (Phases 4, 8) |

**Tests at risk (12 files):** `product-creation`, `admin-product-long-form`,
`admin-product-tag-entry`, `public-product-security`,
`product-detail-image-rendering`, `personalized-recommendations`,
`product-pages-warm-brutalism`, `admin-product-images-security`, and others.

**Baseline: 2004 tests / 161 files passing.**

---

## SECTION 11 — Errors in the brief

1. **8 of the 17 proposed columns already exist.** Plain `ADD COLUMN` fails on
   an existing column; needs `IF NOT EXISTS`.
2. **`ingredients String? @db.Text` would change an existing column's type**,
   breaking `JSON.parse` in two API paths and violating the brief's own rule.
3. **`weight Int?` duplicates `weightGrams Decimal?`.** Two weight columns is a
   correctness hazard. Recommend using the existing one.
4. **Validation path is `src/lib/admin-product-schema.ts`**, not
   `src/lib/validations/product.ts`.
5. **`.strict()` will 400 any new field** until extended.
6. **"111 products"** — actually 116 live (137 total).
7. **"111 missing howToUse"** — content exists in `usageInstructions` on
   116/116 and already renders.
8. **Phase 5's conditional rendering and RW fallback already exist** in
   `ProductTabs.tsx`.
9. **`src/lib/schema/product-schema.ts` (Phase 6) does not exist.** The real
   file is `src/lib/structured-data.ts`.
10. **`fcs-surface` is `#FAF8F6`, not `#F9F3EA`; `fcs-charcoal` does not
    exist** (the token is `fcs-text` `#1a1a1a`). Third engagement with this.
11. **`uniqueSellingPoints String[]`** — the only Postgres array precedent is
    `allergens`, 0/116 used. `Json?` may be safer, but `String[]` is
    consistent; flagging the choice.
12. **Reversibility (rule 22):** only 1 of 11 existing migrations documents a
    rollback. I will include an explicit commented `DROP COLUMN` block.

---

## Recommended plan

1. Add **only the 6 missing columns**, all nullable, `IF NOT EXISTS`.
2. **Backfill `howToUse` from `usageInstructions`** (116 rows) — content already
   shown, just consolidating.
3. Do **not** touch `ingredients`' type; keep `weightGrams`.
4. Extend the Zod schemas before any bulk import.
5. Build bulk import + dashboard + prompt generator.
6. Surface USPs and `suitableFor` in the existing tabs.

### Questions

1. **`weight`: use existing `weightGrams Decimal?`, or add `weight Int?` as
   specified?** I recommend the existing column.
2. **`suitableFor Json?`: add it, or derive from `skinType`/`hairType`/
   `allergens`?** Adding creates two sources of truth for skin type.
3. **Backfill `howToUse` from `usageInstructions`?** Recommended.
4. **`uniqueSellingPoints`: `String[]` or `Json?`?**

---

PHASE 0 AUDIT COMPLETE — Awaiting approval.
