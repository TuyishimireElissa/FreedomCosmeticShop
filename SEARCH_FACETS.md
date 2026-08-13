# Phase 1 — faceted search backend

**Date:** 2026-08-13 · Brief: "Alibaba-style discovery, adapted for a
101-product cosmetics catalogue"

## What the brief asked for vs what was actually missing

The brief's Phase 1 said *"extend `/api/search` to support faceted filtering"*.

**There is no `/api/search`.** It returns 404 and never existed. The real
endpoint is `/api/products`, and it **already accepted every facet in the
brief** before I wrote a line of code:

```
q · search · category · brand · skinType · hairType · shade
minPrice · maxPrice · minRating · inStock · featured · sort · page · limit
```

Verified live before starting:
`/api/products?q=cream&category=skincare&minPrice=1000&maxPrice=20000&sort=price_asc`
returned 10 correct results, cheapest first.

Search performance is also already past the brief's Phase 5 target of <200 ms:

| query | hits | live |
| --- | ---: | ---: |
| vitamin | 22 | 176 ms |
| seramu → serum | 4 | 630 ms |
| vitanin (typo) | 26 | 882 ms |
| uruhu | 70 | 746 ms |
| xyzfake | 0 | 449 ms |

So Phase 1 reduced to the two endpoints that genuinely did not exist.

## Built

### `GET /api/search/facets`

Available filter values and counts for the **current** query.

```jsonc
{
  "categories":  [{ "id", "name", "slug", "count" }],
  "brands":      [{ "id", "name", "slug", "count" }],
  "skinTypes":   [{ "name", "count" }],
  "priceRange":  { "min": 1000, "max": 24000 },
  "total":       106,
  "colors":      [],
  "colorsAvailable": false
}
```

**Each facet omits its own dimension.** This is the Alibaba behaviour and it is
easy to get wrong: if the category counts were computed *with* the category
filter applied, picking "Skincare" would collapse the list to Skincare alone
and the shopper could never switch to Fragrance without clearing filters.
Verified live — with `?category=skincare` the response still offers
body-care 44, fragrance 33, haircare 5, mens-grooming 1, while `total`
correctly reports 23.

Same for price: with `?minPrice=5000&maxPrice=6000` the slider range stays
`1000–24000` instead of collapsing onto the selection.

### `GET /api/products/similar?id={id|slug}&limit=4`

Scoring lives in `src/lib/product-similarity.ts`:

| signal | weight |
| --- | ---: |
| same category | +100 |
| shared skin type | up to +30 |
| price within ±30% | up to +20 |
| in stock | +10 |
| **same brand** | **−15** |

The same-brand penalty is deliberate: "More like this" is a discovery surface,
and four more bottles of the brand already on screen is the least useful
answer.

Live check — seeded with *Pure Egyptian Magic Whitening Serum* (8,500 RWF,
skincare) it returned Veet Gold Turmeric Whitening Oil (8,000), Johnson's Baby
Aqueous Cream (8,000), and Purec Egyptian Gold Lotion (7,000). Same category,
same price band, same intent.

## Deviations from the brief, and why

**1. No colour facet, no colour term in the similarity score.**

The brief specifies colour search in Phase 1 §1, §4 and Phase 2 §C. I queried
the live database first:

- `Product` has **no `color` column**
- `Product` has **no `tags` column** (the brief's fallback)
- `shadeHex` is **NULL on all 106 live products**
- `shade` is **NULL on all 106**

Seven colour swatches would each return zero results. The brief's own
instruction for this case is *"if no tags: this is a data issue — document it,
don't break"* — this document is that. Owner confirmed: **skip colour
entirely.**

`colorsAvailable: false` is returned explicitly so a client cannot confuse
"no colour data" with "the colour facet failed to load".

**2. `brands` is returned but will look empty — that is correct.**

Only **2 of 106** live products have a brand, and both are "Freedom Glow" (one
is a product literally named `soap`). The other four Brand rows link only to
deleted seed products. The facet returns one option. The UI should hide a facet
with fewer than 2 distinct values rather than render a one-option filter.

**3. Makeup is absent from the facets — also correct.**

The category has 6 rows, **all `isDeleted: true` seed data**. 0 live. The
endpoint filters on `isActive` so it never offers a category that leads
nowhere.

**4. Phase 3 and Phase 5.4 were already built.** Faceted filter UI
(`MobileFilters` bottom sheet, `FilterSidebar`, `FilterChips`,
`useProductFilters` with full URL-param state) and the `SearchLog` table with
HMAC-hashed queries already exist and are deployed. Owner decision: leave them
alone.

## The refactor, and why it was necessary

Facet counts are only trustworthy if they are computed from **exactly** the
same predicate as the result list. Two endpoints each building their own
`where` clause will drift, and the sidebar will promise "Skincare (12)" while
the grid shows 9.

So the clause builder moved into **`src/lib/product-filters.ts`** and both
routes call it. `/api/products` behaviour is unchanged — proven, not assumed,
by running the extracted module against the live database and comparing every
probe to production:

```
vitamin 22 · seramu 4 · uruhu 70 · vitanin 26 · izuba 0 · xyzfake 0
kuremu 20 · amavuta 53 · cream+skincare+price 10 · fragrance 33
```

All identical. And the facet counts match the grid exactly on all five live
categories: body-care 44/44, fragrance 33/33, skincare 23/23, haircare 5/5,
mens-grooming 1/1.

## My own errors this phase

**1. I exported a helper from a route file.** `scoreSimilarity` was exported
from `src/app/api/products/similar/route.ts`. `tsc --noEmit` passed; the Next
build failed with `"scoreSimilarity" is not a valid Route export field`. Moved
to `src/lib/product-similarity.ts`, which is the right home anyway. **`tsc`
clean does not mean the build passes.**

**2. I guessed at a performance cause instead of measuring.** I saw ~1030 ms on
`/api/products/similar` from the sandbox and blamed fetching 60 full card
payloads to rank and discard 56. I rewrote it to score on a thin projection —
and the timing did not move. The actual breakdown:

| step | time |
| --- | ---: |
| bare `SELECT 1` (sandbox→Frankfurt) | 144 ms |
| 60 rows, thin projection | 291 ms |
| **4 rows, `PUBLIC_PRODUCT_CARD_SELECT`** | **717 ms** |
| 4 rows, same minus `productImages`+`reviews` joins | 430 ms |

The cost is the card select's joins plus the sandbox link — **not** the
candidate count. The existing `/api/products` pays the identical price (1145 ms
for 12 rows from here) and serves in **81–154 ms warm from Vercel**, which sits
in the same region as the database. There was no regression to fix. I kept the
thin projection because it is strictly less work and decouples ranking from the
card payload, but I corrected the comment that claimed it was the fix.

**3. A test passed while checking nothing.** Mutation testing showed that
swapping `buildFilterClauses(filters, 'category')` for
`buildFilterClauses(filters)` — which silently collapses the category list —
left all 35 tests green. Nothing asserted the route actually passes the omit
argument. Added.

**4. An assertion matched the wrong line.** The pre-existing
`'category:'` substring check also matched the ILIKE fallback clause, so
renaming the real category filter still passed. Replaced all eight filter
checks with regexes that match the actual `and.push({ category: { OR:` call.

## Verification

- **36 new tests** in `search-facets-and-similar.test.ts`
- **Mutation tested: 19 of 19 caught**, each confirmed to have modified the
  file before trusting the result
- 4 pre-existing assertions in `search-trigram-performance.test.ts` were
  **stale, not regressions** — they scraped the route for logic that moved to
  the shared module. Retargeted, then re-mutation-tested (6/6 caught).

Gates: tsc clean · lint 0 errors / 6 pre-existing warnings · **1,412 tests
passing (was 1,376)** · build 66/66 · **shared JS 103 kB unchanged** · 0 new
packages.

## Note for whoever runs this locally

`$queryRaw` and `groupBy` fail against the pooled `DATABASE_URL`
(`prepared statement "s8" does not exist`, PgBouncer). Use `DIRECT_URL` for
local runs. Vercel is unaffected.
