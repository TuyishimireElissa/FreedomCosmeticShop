# Phase 0 — five search improvements, audit (read only)

Performed 2026-08-15 against `HEAD = 773ad1b`, the live database, and
`https://freedomcosmeticshop.com`. No code written, nothing changed.

---

## Summary

| # | Feature | Verdict | Effort |
|---|---|---|---|
| 1 | Makeup vocabulary | ⚠️ **Build, but it finds nothing** — see below | 30 min |
| 2 | Category quick jumps | ✅ **Build.** Data source already exists | ~1 h |
| 3 | Suggestions with thumbnails | 🟢 **ALREADY BUILT AND LIVE** | 0 |
| 4 | Related searches | ⚠️ **Build, but the data is my own test traffic** | ~1 h |
| 5 | Per-user search history | 🛑 **Needs a schema change + a privacy decision** | ~3 h |

---

## ⚠️ Four corrections to the brief

**1. Two file paths are wrong.**

| Brief says | Actually at |
|---|---|
| `src/components/products/SearchOverlay.tsx` | `src/components/**storefront**/SearchOverlay.tsx` |
| `src/components/products/SearchWithSuggestions.tsx` | `src/components/**storefront**/SearchWithSuggestions.tsx` |

**2. Recent searches use `sessionStorage`, not `localStorage`.** The key
`fcs_recent_searches` is real (`SearchOverlay.tsx:59`, `SearchWithSuggestions.tsx:45`),
but it is `sessionStorage` — it is **already cleared when the tab closes**. That
materially changes Phase 5: history is not "browser-specific and persistent", it
is per-tab and short-lived.

**3. Phase 3 is already done.** `/api/search/suggestions` returns
`image`, `imageUrl`, `imageAlt`, `imageAltRw`, `brandName`, `categoryName`, and
`SearchWithSuggestions.tsx:318` already renders a 48 px thumbnail, name, brand ·
category, and price, with `role="option"`, `aria-selected` and arrow-key
navigation. **Verified live.**

**4. `CONTROLLED_SEARCH_VOCABULARY` and `LOCAL_SEARCH_VOCABULARY` are different
things.** The brief says "add to CONTROLLED". That list (52 terms) only drives
**popular-search analytics**. Search *recall* comes from
`LOCAL_SEARCH_VOCABULARY` (196 keys). Adding "lipstick" to CONTROLLED alone
would make it countable but **would not improve search**. Both need entries.

---

## 1 — Makeup vocabulary

Of the 27 terms requested, **21 are in neither list**. Six already exist as
synonym keys: `blush`, `lip balm`, `bronzer`, `setting spray`, `primer`, and
`mask` (in CONTROLLED).

### 🛑 The problem: you stock no makeup

Measured against the live catalogue:

| term | products found |
|---|---|
| lipstick, mascara, foundation, eyeshadow, concealer, kohl | **0** |
| blush | 2 (matches text, not a blush product) |
| powder | 2 |
| shea | 3 · coconut 9 · argan 4 · glycerin 9 |

**Makeup category: 0 products.** Adding `lipstick` makes the shop *findable* for
a term that returns an empty grid — which now shows the WhatsApp RFQ panel from
the last engagement, so it is not a dead end. That is a real benefit, but it is
**demand capture, not search improvement**, and the brief should say so.

The **ingredient terms are different** — `shea`, `coconut`, `argan`, `glycerin`
map to 3–9 real products each and genuinely improve recall today.

**Recommendation:** ship both, but understand makeup terms convert to WhatsApp
enquiries, and ingredient terms convert to products.

---

## 2 — Category quick jumps

**Data source already exists.** `/api/search/facets?search=<q>` returns
per-category counts with each facet self-excluded. Verified live:

```
/api/search/facets?search=isabune
  soap 33 · baby-kids 1 · body-care 1     ← exactly the 3 pills the brief wants
```

`ProductsPageClient.tsx:50,73` already holds `categories` state and fetches
`/api/categories`. `category-i18n-map.ts` already resolves `nameRw` → i18n key →
English.

**Nothing new is needed server-side.** One presentational component plus a
`useFacets()` read.

⚠️ **The brief's rule is self-contradictory:** *"Only show if search matches
multiple categories. Only show if 3+ categories match."* Two is "multiple". I
will use **3+** as the operative rule and flag it.

---

## 3 — Suggestions with thumbnails · ALREADY LIVE

Live response for `?q=dettol`:

```json
{ "id","name","slug","price","image","imageUrl","imageAlt",
  "imageAltRw","brand","brandName","categoryName" }
```

`getCloudinaryUrl(publicId, 'THUMBNAIL')` at `suggestions/route.ts:101` already
applies the transformation. The component renders it at
`SearchWithSuggestions.tsx:318`.

**Recommend skipping Phase 3 entirely.** Rebuilding it risks regressing 39
passing overlay/voice tests for no user-visible gain. The only genuine deltas
against the brief: thumbnail is **48 px, not 60 px**, and match text is not
bolded. Both are one-line tweaks if you want them.

---

## 4 — Related searches

`/api/search/popular` works and returns 13 terms, 12 with results.

### 🛑 But the data is almost entirely mine

I generated most of those rows verifying Phase 3 of the previous engagement —
I flagged this in `SEARCH_GAPS_COMPLETE.md`. Showing them as *"People also
searched for"* would present **my test traffic as customer behaviour**.

Counts are also tiny (1–4 searches). With a 3-term minimum the section would
render today, populated by noise.

**Recommendation:** build it, but gate it on a **minimum search count** (say 3+)
so it stays hidden until real traffic accumulates. Source-gated, per rule 20.

---

## 5 — Per-user search history

### 🛑 Three blockers

**Blocker 1 — schema change on a database with no migration table.** Confirmed:
no `prisma/migrations/` folder, and `_prisma_migrations` **does not exist**.
`prisma migrate dev` would read the whole live schema as drift and **offer to
reset — destroying 132 products, 11 orders and 8 users**. Requires hand-written
SQL in `prisma/manual-migrations/` plus a hand-edited `schema.prisma`.

**Blocker 2 — it inverts the privacy model.** The current design HMAC-hashes
every query specifically so search text is unrecoverable. Phase 5 asks to store
**raw search text** for logged-in users. That is defensible — they are
authenticated and it is their own data — but it is a **deliberate reversal of a
documented decision**, not an extension of it. It needs your explicit sign-off,
not my assumption.

**Blocker 3 — only 8 users exist**, and ordering is WhatsApp-only with payment
on delivery, so most shoppers never log in. This is the most expensive phase and
serves the fewest people.

**Auth pattern is ready:** `requireAuth()` from `@/lib/auth`, used at
`wishlist/route.ts:16`. Reusable as-is.

**Recommendation:** defer Phase 5. If you want it, do it last and on its own.

---

## Tests at risk

| File | Tests | Risk |
|---|---|---|
| `search-overlay-voice.test.ts` | 39 | **High** if Phase 3 touched — recommend skipping Phase 3 |
| `search-facets-and-similar.test.ts` | 36 | Medium — Phase 2 reads facets |
| `filter-facet-counts.test.ts` | 26 | Medium — same |
| `search-smart-features.test.ts` | 23 | Low |
| `search-vocabulary.test.ts` | 13 | Low — count assertion is `>= 189`, so additions pass |
| `search-api-security.test.ts` | 6 | **High** if Phase 5 stores raw text |

Baseline: **1,846 passing / 157 files**, shared JS **103 kB**, 68 routes.

---

## Recommended order

| | Phase | Why |
|---|---|---|
| 1 | **Vocabulary** | Safest, no UI, immediate recall gain from ingredient terms |
| 2 | **Category quick jumps** | Real user value, data source already live |
| 3 | ~~Thumbnails~~ | **Skip — already built** |
| 4 | **Related searches** | Build with a count gate so it stays hidden until real data |
| 5 | **Search history** | **Defer** — schema risk, privacy reversal, 8 users |

Bundle impact: phases 2 and 4 add two small client components. I will measure
against the 103 kB budget at each step and stop if it moves.

---

## Questions before Phase 1

1. **Makeup terms find zero products.** Confirm you want them as demand-capture
   into the WhatsApp RFQ panel?
2. **Quick jumps: 3+ categories, or 2+?** The brief says both.
3. **Phase 3 — skip it?** It is already live; rebuilding risks 39 tests.
4. **Related searches — gate on 3+ searches per term** so my test data stays
   hidden?
5. **Phase 5 — defer?** It stores raw search text, reversing the current privacy
   model, and needs hand-written SQL.

---

**PHASE 0 AUDIT COMPLETE — Awaiting approval.**
