# Phase 0 — Search system audit (read only)

Performed 2026-08-15 against `HEAD = 5d75f85`, the live database, and
`https://freedom-cosmetic-shop.vercel.app`. No code written, nothing changed.

---

## ⚠️ HEADLINE FINDING — READ THIS FIRST

**Five of your seven target features are already built, shipped and live.**

This search system was built across five phases on 2026-08-13 and is documented
in four files already in the repo: `SEARCH_FACETS.md`, `SEARCH_OVERLAY_VOICE.md`,
`FILTER_FACET_COUNTS.md`, `SEARCH_SMART_FEATURES.md`.

| # | Target feature | Status |
|---|---|---|
| 1 | Smart search — typos, autocomplete, bilingual | ✅ **BUILT** |
| 2 | Alibaba faceted sidebar with counts | ✅ **BUILT** |
| 3 | Voice search (Web Speech API) | ✅ **BUILT** |
| 4 | Visual / image search (Cloudinary AI) | ❌ **NOT BUILT** |
| 5 | WhatsApp RFQ on zero results | ❌ **NOT BUILT** |
| 6 | Dedicated full search page | ⚠️ **PARTIAL** — overlay + `/products`, no `/search` route |
| 7 | Search analytics | ✅ **BUILT** (231 real rows logged) |

**There are 164 existing search tests across 9 files.** Rebuilding any of the
five green rows would be redundant work with a high chance of regression.

---

## SECTION 1 — Current search implementation

### Files

| File | Lines | What it does |
|---|---|---|
| `src/lib/product-filters.ts` | 185 | Parses filters, builds Prisma clauses, resolves the search clause. **Shared by the list and the facet endpoint** so counts cannot drift from results |
| `src/lib/search-match.ts` | 108 | Trigram matcher. One raw SQL statement, `EXISTS(unnest(terms))` over 16 fields, ranked by `similarity()` |
| `src/lib/search-vocabulary.ts` | 427 | Kinyarwanda↔English vocabulary, Jaro-Winkler, query expansion, price parsing |
| `src/lib/search-correction.ts` | 120 | "Did you mean" — threshold `0.86` (L50) |
| `src/lib/search-trending.ts` | 86 | Trending searches + category chips |
| `src/server/services/search-analytics.ts` | 59 | HMAC-hashed query logging |
| `src/server/services/search.ts` | 104 | **Algolia client — see risk R1 below** |

### Key line numbers

- `SEARCHABLE_TEXT_FIELDS` — `src/lib/product-filters.ts:24-28`
- `resolveSearchClause()` — `src/lib/product-filters.ts:165-185`
- `findMatchingProductIds()` — `src/lib/search-match.ts:64-107`
- `MAX_SEARCH_TERMS = 40` — `src/lib/search-match.ts:59`
- `MAX_MATCH_IDS = 600` — `src/lib/search-match.ts:62`
- Search entry point — `src/app/api/products/route.ts:30-31`
- Relevance re-sort after Prisma — `src/app/api/products/route.ts:90-99`
- Analytics write — `src/app/api/products/route.ts:112-115`

### What fields are searched

16 fields, via `SEARCHABLE_TEXT_FIELDS` plus two joins:

```
name · shortDescription · description · sku · ingredients · ingredientsRw
expectedResults · expectedResultsRw · howToUse · howToUseRw · shade · shades
undertone · countryOfOrigin        + Brand.name + Category.name (joined)
```

**There is no `tags` column on Product.** The brief assumes one; it does not
exist.

### How results are ranked

1. `similarity(lower(name), phrase)` — pg_trgm, descending
2. `featured` descending
3. `createdAt` descending

Ranked ids come back from raw SQL, then `route.ts:90-99` re-sorts the fetched
Prisma page back into rank order — otherwise `IN (...)` would scramble it and
the best match could land on page 3.

Other sorts available: `price-asc`, `price-desc`, `rating`, `best-selling`
(real unit sales, not a proxy), `newest`.

### Typos and synonyms — both handled

- **Typos:** `suggestCorrection()` with Jaro-Winkler at 0.86. Verified live:
  `?q=vitamn` returns products.
- **Synonyms:** 200+ Kinyarwanda entries expand one word into up to 40 terms.
  `uruhu` → skincare, skin care, skin, face cream … → **71 live hits**.

### Search UI

| Component | Lines | Mounted at |
|---|---|---|
| `SearchOverlay.tsx` | 470 | `Navbar.tsx:284` — full-screen overlay, voice, recents, trending, debounced instant results |
| `SearchWithSuggestions.tsx` | 330 | autocomplete dropdown |
| `HomeSearch.tsx` | 71 | homepage entry point |
| `DidYouMean.tsx` | 72 | spelling correction, **probes before rendering** so it never suggests a dead end |

---

## SECTION 2 — Current filter implementation

**Filters are URL params**, in `src/hooks/useProductFilters.ts`.

`ACTIVE_FILTER_KEYS` (L36-38): `category, brand, minPrice, maxPrice, skinType,
hairType, inStock, shade, minRating`

| Question | Answer |
|---|---|
| How implemented? | URL search params, read at `useProductFilters.ts:40` |
| Persist? | Yes — shareable, bookmarkable, survives back button |
| Sidebar | `FilterSidebar.tsx` (111 lines) desktop · `MobileFilters.tsx` (222) phone |
| **Counts per option?** | **Yes** — `useFacets()` at `FilterSidebar.tsx:27`, `countFor.category(...)` at L46 |
| Dead filters? | Hidden or disabled — `showRating`, `showHairType`, `showShade`, `showBrand` flags |

Empty options are rendered `disabled` + `aria-disabled` with `opacity-40`
(`FilterSidebar.tsx:94-104`), so a shopper cannot click into an empty result.

---

## SECTION 3 — Search API routes

| Route | Lines | Purpose |
|---|---|---|
| `/api/products` | 124 | **The real search endpoint.** `search`, `category`, `brand`, price, `skinType`, `hairType`, `shade`, `minRating`, `inStock`, `sort`, `page`, `pageSize` (max 48) |
| `/api/search/facets` | 190 | **Facet counts.** groupBy, not N counts |
| `/api/search/suggestions` | 123 | Autocomplete + product previews |
| `/api/search/popular` | 18 | Popular searches |
| `/api/search/track-zero-result` | 35 | Zero-result capture |
| `/api/admin/search/zero-results` | 36 | Admin view of failed searches |

### Facets are true Alibaba-style

Each facet drops **its own** dimension before counting — category counts are
computed with the category filter removed, brand counts with brand removed.
That is what makes "Skincare (12)" honest while a brand filter is active.

Live response confirms: `categories 9 · brands 1 · skinTypes 6 ·
priceRange {1000, 24000} · total 107 · hairTypes 0 · ratedCount 0 ·
shadedCount 1 · colorsAvailable false`

### Analytics exists

`model SearchLog` at `prisma/schema.prisma:1668-1683`. **Raw search text is
never stored** — queries are HMAC-SHA256 hashed (`search-analytics.ts:30-34`).
Live: **231 rows, 73 zero-result**.

`/api/search/popular` currently returns `[]` with an honest
`methodology: {rawQueriesStored: false, controlledVocabularyConfigured: false}`
— it cannot show popular terms because it deliberately cannot read them back.

---

## SECTION 4 — Cloudinary

| Question | Answer |
|---|---|
| Package | **`cloudinary@^2.10.0` already in `package.json:37`** — no new dependency needed |
| Config | `src/lib/cloudinary.ts` · cloud `dohoc0tmp` |
| Active features | `uploadImageBuffer()`, `uploadImage()`, `deleteImage()`, transformations on upload |
| Used by | product images, review photos, admin logo, `/api/upload` |
| AI features | **Not enabled.** No `google_tagging`, `aws_rek_tagging`, `imagga`, `categorization` or `detection` anywhere |
| Account tier | **Could not determine — requires the Cloudinary dashboard.** I will not guess |

**Blocker for feature 4:** Cloudinary auto-tagging add-ons (Google Auto Tagging,
Imagga, AWS Rekognition) are **paid** on most plans. Visual search also needs a
tag vocabulary to match against, and **your products have no tags column and
`ingredients` filled on only 4 of 107 rows**. This needs your decision before
any work starts — see Section 8, risk R4.

---

## SECTION 5 — i18n search support

| Question | Answer |
|---|---|
| Kinyarwanda queries? | **Yes** — 200+ vocabulary entries, verified live |
| Product names in Kinyarwanda? | **No.** All 107 product names are English/brand |
| Kinyarwanda product content | `ingredientsRw`, `expectedResultsRw`, `howToUseRw`, `warningsRw` exist and **are searched** — but are essentially empty on live data |
| Category names | **Yes** — `nameRw` on all 16 categories |
| How search bridges the gap | `expandSearchQuery()` maps the Kinyarwanda word to English terms, then matches English product text |

**Both apostrophe forms are handled** — `search-vocabulary.ts:22-25` carries
`amavuta y'uruhu` (ASCII) *and* `amavuta y’uruhu` (U+2019). That is real care.

Measured recall: `uruhu` 71 · `amavuta` 54 · `isabune` 35 · `seramu` 4 ·
`xyzfake` 0.

---

## SECTION 6 — Performance baseline

### Live latency, 3 runs each, measured from sandbox

| Query | Hits | Run 1 (cold) | Run 2 | Run 3 |
|---|---|---|---|---|
| uruhu | 71 | 1.401s | **0.099s** | 0.198s |
| vitamin | 26 | 0.800s | 0.154s | 0.151s |
| seramu | 4 | 0.689s | 0.143s | **0.066s** |
| isabune | 35 | 0.676s | **0.066s** | 0.150s |
| amavuta | 54 | 0.679s | **0.062s** | 0.077s |
| xyzfake | 0 | 0.522s | 0.147s | 0.157s |

Warm: **62–200 ms** including network. This was **17.1 seconds** before the
trigram work (documented in `search-match.ts:17-19`).

### Postgres indexes — confirmed present in the live database

```
extension : pg_trgm  ✅
indexes   : Product_name_trgm_idx
            Product_shortDescription_trgm_idx
            (+ Brand_name_trgm_idx, Category_name_trgm_idx per migration)
```

Migration: `prisma/manual-migrations/20260812_search_trigram.sql`, idempotent.

### Bundle

**Shared JS 103 kB. `/products` route 14.6 kB. Build 67/67 pages.** Unchanged
across the entire previous engagement.

### Caching

`/api/products` → `s-maxage=60, stale-while-revalidate=300` (`route.ts:119`).
Client-side recents in `localStorage` under `fcs_recent_searches`.

---

## SECTION 7 — Gap analysis

| # | Feature | Exists? | Quality | Gap to fill |
|---|---|---|---|---|
| 1 | Smart search | ✅ Yes | **Excellent** — trigram, 40-term expansion, Jaro-Winkler 0.86, 16 fields, 62-200ms | **Nothing.** Optional: fuzzy on `ingredientsRw` once that data exists |
| 2 | Faceted sidebar | ✅ Yes | **Excellent** — self-excluding counts, dead options disabled, mobile sheet | **Nothing.** brands 1, hairTypes 0, colors 0 are *data* gaps, not code gaps |
| 3 | Voice search | ✅ Yes | **Good** — Web Speech, 2s silence, permission states, hidden when unsupported | **Nothing buildable.** `rw-RW` does not exist in any browser; `en-US` used deliberately (`use-voice-search.ts:65-77`) |
| 4 | Visual search | ❌ No | — | **Everything.** Needs paid Cloudinary add-on + a tag vocabulary that does not exist. **Blocked on your decision** |
| 5 | WhatsApp RFQ on 0 results | ❌ No | — | **Small and high value.** Zero-result state exists; needs a WhatsApp CTA. `getWhatsAppLink()` already exists |
| 6 | Dedicated search page | ⚠️ Partial | Overlay + `/products?search=` work well | No `/search` route. **Mostly cosmetic** — `/products` already is the results page |
| 7 | Search analytics | ✅ Yes | **Good, privacy-first** — 231 rows | `/api/search/popular` returns `[]` by design. Gap is a **controlled vocabulary**, not more logging |

---

## SECTION 8 — Technical risks

**R1 — Dead Algolia code that is still called.** `src/server/services/search.ts`
implements an Algolia client. `searchProducts()` is **never called** — storefront
search is 100% Postgres. But `indexProduct()` and `unindexProduct()` **are**
called from `src/app/api/admin/products/route.ts:204` and
`[id]/route.ts:192,318`. They are fire-and-forget (`void`), so if
`ALGOLIA_APP_ID` is unset they fail silently on every product save. Harmless
today, confusing forever. *Recommend: leave it, document it. Removing it touches
admin product code — a Rule 3 protected area.*

**R2 — Facet/result divergence.** `/api/products` and `/api/search/facets`
share `buildFilterClauses()` deliberately. Any change to one must go through the
shared module or the sidebar will promise "Skincare (12)" and the grid will show
9. `filter-facet-counts.test.ts` (26 tests) guards this.

**R3 — Trigram fallback path.** `resolveSearchClause()` catches a trigram
failure and falls back to 640 ILIKE clauses — the 17-second path. It is correct
as a safety net, but a silent 17s response would look like an outage. No alert
exists on that catch.

**R4 — Visual search cost and data.** Needs a paid Cloudinary add-on **and** tag
data the catalogue does not have. Building it against 4-of-107 populated
`ingredients` would produce a feature that returns nothing.

**R5 — Analytics is deliberately one-way.** Queries are HMAC-hashed, so you can
count recurrence but **never read what customers typed**. "Show me top searches"
is impossible without changing the privacy model — that is a decision, not a bug.

### Existing tests — 164 across 9 files

| File | Tests |
|---|---|
| `search-facets-and-similar.test.ts` | 36 |
| `search-overlay-voice.test.ts` | 39 |
| `filter-facet-counts.test.ts` | 26 |
| `search-smart-features.test.ts` | 23 |
| `search-trigram-performance.test.ts` | 18 |
| `search-vocabulary.test.ts` | 9 |
| `search-api-security.test.ts` | 5 |
| `search-filter-integration.test.ts` | 4 |
| `smart-search-performance.test.ts` | 4 |

Full suite: **1,766 passing / 152 files.**

### Dependencies on current behaviour

`/api/products` is consumed by `ProductsPageClient`, `SearchOverlay`,
`SearchWithSuggestions`, `HomeSearch`, `FeaturedProducts`, `CategoryGrid` and
the quiz. Its response shape is intentionally duplicated (`data.products` **and**
top-level `products`) for older callers. **Do not narrow it.**

---

## SECTION 9 — Recommended implementation order

Given five of seven exist, I recommend building **only what is missing**, in
this order:

### Tier 1 — build now, high value, low risk

**Step 1 · WhatsApp RFQ on zero results** *(feature 5)*
The single highest-value gap. **73 of 231 logged searches returned nothing** —
that is a third of all searches, and every one is a customer who wanted
something you might be able to source. Reuses `getWhatsAppLink()` and the exact
pattern just shipped in `CategoryComingSoon.tsx`. One component, one condition,
no schema change, no package.

### Tier 2 — cheap, cosmetic

**Step 2 · `/search` route** *(feature 6)*
A thin route that reuses `ProductsPageClient`, or a redirect to
`/products?search=`. Gains a shareable, memorable URL. **I recommend the
redirect** — a second full page duplicates a 258 kB route for no functional
gain, and Rule 18 caps the bundle.

### Tier 3 — needs your decision first

**Step 3 · Popular searches** *(feature 7 completion)*
Requires a **controlled vocabulary**: log a query only when it matches a known
term, so you learn "12 people searched sunscreen" without ever storing free
text. Keeps the privacy model intact. ~40 terms, no schema change.

**Step 4 · Visual search** *(feature 4)* — **BLOCKED.** Needs (a) confirmation
your Cloudinary plan includes an auto-tagging add-on and what it costs, and
(b) tag data that does not exist yet. **Do not start this without both.**

### Explicitly NOT recommended

Rebuilding features 1, 2 and 3. They are live, fast, tested by 164 assertions,
and better than a from-scratch rewrite would be on the first attempt.

---

## SECTION 10 — Files that would change

Scoped to the Tier 1–3 work only.

### Step 1 — WhatsApp RFQ

| Category | File | Change |
|---|---|---|
| Frontend | `src/components/products/SearchRfq.tsx` | **new** |
| Frontend | `src/components/products/ProductGrid.tsx` | one branch in the zero-result state |
| Frontend | `src/components/products/ProductsPageClient.tsx` | pass the query down |
| i18n | `src/lib/i18n/translations/{rw,en}.ts` | ~4 keys, each `// verified-rw` |
| Tests | `src/lib/__tests__/search-rfq.test.ts` | **new** |

### Step 2 — `/search` route

| Category | File | Change |
|---|---|---|
| Frontend | `src/app/search/page.tsx` | **new** — redirect to `/products?search=` |
| Tests | existing route test extended | |

### Step 3 — popular searches

| Category | File | Change |
|---|---|---|
| API | `src/app/api/search/popular/route.ts` | read the controlled vocabulary |
| Backend | `src/server/services/search-analytics.ts` | store a vocabulary id alongside the hash |
| Backend | `src/lib/search-vocabulary.ts` | export the controlled term list |
| Tests | `src/lib/__tests__/search-vocabulary.test.ts` | extend |

### Not touched

No database migration for Steps 1–3. No new package. `src/lib/search-match.ts`,
`src/lib/product-filters.ts`, `/api/products` and `/api/search/facets` stay as
they are — Rule 11, never delete working code.

---

## Questions I need answered before Phase 1

1. **Given five of seven features already exist, do you want me to build only
   the three genuine gaps** (RFQ, `/search` route, popular searches), or do you
   want something specific changed in the existing search?

2. **Visual search: does your Cloudinary plan include an auto-tagging add-on,
   and what does it cost?** I cannot see your billing tier, and I will not
   guess. Without it, feature 4 cannot be built.

3. **`/search` — real page or redirect?** I recommend a redirect: a second
   results page duplicates a 258 kB route and risks the 103 kB shared budget.

4. **Popular searches — accept a controlled vocabulary?** Free text can never be
   read back under the current privacy model, which I would not weaken without
   you saying so explicitly.

---

**PHASE 0 AUDIT COMPLETE — Awaiting approval to proceed.**
