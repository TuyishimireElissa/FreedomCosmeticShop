# Phase 3 — filter counts, and removing filters that lead nowhere

**Date:** 2026-08-13 · **Commit:** `683a851` · Live and verified

## The brief asked me to build something that already existed

Phase 3 asked for a `<SearchFilters />` component: bottom sheet, accordions,
URL params, shareable filtered URLs, active filter pills.

**All of it was already built and deployed.** Checked before writing code:

| Brief item | Reality |
| --- | --- |
| Mobile bottom sheet, drag handle | `MobileFilters.tsx` — a `Sheet` at `max-h-[90vh]` |
| Desktop left sidebar | `FilterSidebar.tsx` |
| Active filter pills, removable | `FilterChips.tsx` |
| URL params, back button, shareable | `useProductFilters.ts` |

Owner decision: leave it. So I looked for what was actually **wrong** instead.

## Two real defects, both measured live

### 1. The facets endpoint was consumed by nothing

`/api/search/facets` was built in Phase 1 and **no component ever called it**.
Every filter listed values with no counts, so a shopper could not tell
"Skincare (23)" from an option that would empty the page.

### 2. Twenty controls were dead ends

Probed against live production **before** touching any code:

```
hairType = NATURAL RELAXED WAVY CURLY COILY ALL_HAIR  ->  0 products each
minRating = 2 / 3 / 4                                  ->  0 each
shade = Deep / Medium                                  ->  0
```

Ten controls on the desktop sidebar, the same ten in the mobile sheet. Every
single one returns zero, because those columns are empty across all 106 live
products.

**A filter that always empties the page is not a filter, it is a trap** — the
shopper concludes the shop has no stock.

I confirmed the working controls at the same time, so this is not a blanket
claim: `skinType` OILY 20, DRY 21, COMBINATION 21, SENSITIVE 20, ALL 19;
categories body-care 44, fragrance 33, skincare 23, haircare 5,
mens-grooming 1.

## What changed

- Both filter surfaces now show **live counts** for the current query.
- Hair type, rating and shade are **not rendered** while their columns are
  empty.
- Brand is hidden on a different rule: it has exactly **one** option covering
  2 of 106 products. A one-option filter cannot narrow anything.
- Zero-count options are **disabled and dimmed**, not removed — an option
  vanishing mid-interaction is more disorienting than a greyed-out one. The
  currently-selected option stays clickable so it can always be cleared.
- Active chips show the **display name**, not the raw slug. They said
  "Category: body-care"; they now say "Category: Body Care".
- The mobile **Apply** button previews the result count for the *pending*
  selection and is disabled when that selection would return nothing.

### Nothing is hardcoded off

Visibility is derived from counts the API reports (`hairTypes`, `ratedCount`,
`shadedCount`). The day the owner adds a review, the rating filter comes back
on its own with no code change. A test asserts these flags are never literal
booleans.

### Why the Apply preview is a separate request

`facets.total` could not be reused. The sheet edits a **local copy** of the
filters, so `facets.total` still describes the previously applied query.
Labelling the button "Apply (44 results)" while the pending selection actually
yields 3 would be worse than showing no number at all. The preview is
debounced at 250 ms, aborted on change, and silently omits the number if it
fails.

## Three mistakes of my own

**1. I wrote a comment that was a lie.** The hook's doc claimed the gates were
"derived from live data" while the flags were hardcoded `false`. I then made
the endpoint actually report `hairTypes` / `ratedCount` / `shadedCount` so the
comment became true.

**2. My shade check counted 105 products that have no shade.** I used
`{ shades: { not: null } }`. The `shades` column stores the **string `"[]"`**
— an empty JSON array, not `NULL`. That would have rendered a shade box
returning 0 results for every input. Both the empty array and the empty string
are now excluded.

The single product that genuinely qualifies is a fragrance mist whose "shade"
reads *"Pink packaging / fragrance mist"* — not a makeup shade. So the
threshold is **2**, matching the brand rule.

**3. The skin-type counts were wrong, and I caught it by diffing facet counts
against grid totals.**

The facet said `OILY = 1`. `/api/products?skinType=OILY` returned **20**.

`buildFilterClauses` matches `skinType CONTAINS X **OR** CONTAINS 'ALL'`,
because a product tagged ALL suits every skin type. I was counting each JSON
value in isolation. Every category matched; every skin type did not.

Verified after the fix, live:

| skin type | facet | grid |
| --- | ---: | ---: |
| OILY | 20 | 20 |
| DRY | 21 | 21 |
| COMBINATION | 21 | 21 |
| SENSITIVE | 20 | 20 |
| NORMAL | 21 | 21 |
| ALL | 19 | 19 |

**Mutation testing also exposed three of my assertions passing vacuously**,
because the anchor string appeared more than once in the file and only the
first copy was mutated. They now count occurrences rather than checking
presence.

## Verification

**37 new tests. Mutation tested: 24 of 24 caught**, each confirmed to have
actually modified the file before trusting the result.

Facet counts diffed against grid totals for all 5 categories and all 6 skin
types — **every one matches**, live.

Gates: tsc clean · lint 0 errors / 6 pre-existing warnings · **1,508 tests
passing (was 1,471)** · build 66/66 · **shared JS 103 kB unchanged** ·
`/products` 13.3 → 14.3 kB (+1 kB for live counts) · 0 new packages.

## What the owner sees now

Today the filter panel shows **Category**, **Price** and **Skin type**, each
with counts. That is honest — it is everything the catalogue can actually
filter by.

Four filters are waiting on data:

| Filter | Returns when |
| --- | --- |
| Rating | any product has one review |
| Hair type | any product has `hairType` set |
| Shade | 2+ products have a real shade |
| Brand | 2+ brands have live products |

No code change needed for any of them.
