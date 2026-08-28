# PHASE 0 — SEARCH SYSTEM AUDIT (read-only)

**Date:** 2026-08-26 · **Local HEAD:** `f5a4b68` (== deployed) · **Scope:** read-only. Nothing changed. Live checks via public GET requests only.

---

## HEADLINE — MOST OF THIS BRIEF IS ALREADY BUILT AND LIVE

This search stack was built across earlier phases (see `SEARCH_V2_COMPLETE.md`, `SEARCH_OVERLAY_VOICE.md`, `SEARCH_FACETS.md`). **13 search test files, 164+ tests** already exist. Plan for ~30% new work, not 100%.

| Brief item | Status |
|---|---|
| Search overlay (full-screen mobile / dropdown desktop) | ✅ `SearchOverlay.tsx` (storefront/, 540 lines) |
| Mobile search bar | ✅ `MobileSearchBar.tsx` (sticky, under header) |
| Homepage search | ✅ `HomeSearch.tsx` |
| Desktop inline combobox | ✅ `SearchWithSuggestions.tsx` (navbar + products page) |
| Voice search (mic icon) | ✅ `use-voice-search.ts` — capability-gated (all iOS hidden, browsers are WebKit) |
| Recents (`fcs_recent_searches`) | ✅ — but **sessionStorage**, not localStorage (deliberate, documented) |
| Trending searches | ✅ `TRENDING_SEARCHES` (5 terms, each measured to return hits) |
| Category quick pills | ✅ `CATEGORY_CHIPS` (5 chips) — **no product counts** |
| Jaro-Winkler correction | ✅ `jaroWinkler()` + `suggestCorrection()`, threshold **0.86** (measured gap 0.961↔0.757) |
| pg_trgm fuzzy matching | ✅ `search-match.ts` (single-statement trigram, GIN indexes from `20260812_search_trigram.sql`, 17.1s → ~3ms) |
| Kinyarwanda vocabulary | ✅ `LOCAL_SEARCH_VOCABULARY` (~200 terms, incl. spelling variants loreal/nivea/vaseline...) |
| `/api/products?search=` | ✅ exists (search+filters+facets+pagination+analytics) |
| `/api/search/suggestions` | ✅ exists (debounced autocomplete w/ thumbnails) |
| `/api/search/facets` | ✅ exists (Alibaba counts, same predicate as grid) |
| Similar-products scoring | ✅ `src/lib/product-similarity.ts` + `/api/products/similar` (by product id) |

## BRIEF ERRORS (measured — do not take on faith)

1. **`BRAND_PHONETIC_MAP` does not exist.** No such export anywhere in `src/`. The only brand handling is the "Common brand spellings" block in `search-vocabulary.ts` (loreal, nivea, neutrogena, maybelline, dove, vaseline) — no Pyary/piyari entry. Any Phase 2 brand-phonetic fallback must be built new (inside the existing vocabulary file — no new packages).
2. **File paths wrong:** `SearchOverlay.tsx` etc. are in `src/components/storefront/`, not `src/components/products/`.
3. **`eyeliner` → "makeup category" is impossible.** Live measured: makeup category has **0 active products** (all 6 rows are `isDeleted` seed). The brief's Phase 4 example cannot succeed as written; the fallback for "eyeliner" would have to broaden to other live categories (skincare/body/nail). **Needs owner decision.**
4. **Recents are sessionStorage** (not localStorage) — deliberate: a shopper on a shared phone keeps nothing after tab close; signed-in shoppers get server-side history (`/api/user/search-history`).
5. `shadow-fcs-2` **does exist** ✓ — tailwind `boxShadow: { 'fcs-2': 'var(--fcs-shadow-2)' }`.
6. Touch targets: chips are `min-h-10` = **40px**, below the brief's own 44px minimum (mic/close are 48px ✓). Real gap to fix in Phase 1/3.

## MEASURED LIVE BEHAVIOR (today, public API)

| Query | Result today |
|---|---|
| `vazeline` | **6 hits** (Vaseline products) — already works via trigram/vocab |
| `vitalin` | **22 hits** — works (vitamin expansion) |
| `vitanin` | 26 per earlier audit — works |
| `seramu` / `uruhu` | 4 / 70 — work |
| `eyeliner` | **0 — dead end** (no makeup stock) |
| `xyzzy123` | **0 — dead end** |

Current zero-result UX: overlay shows "no products found" + did-you-mean; `/products` page shows **SearchRfq** (WhatsApp sourcing CTA, already shipped, `#1E874A` pill 4.55:1 AA). Both are helpful, but neither returns **similar products**.

## WHAT IS GENUINELY MISSING (the real work)

- **Phase 1:** overlay input polish per brief (48/56px, fcs-surface bg, `rounded-fcs-lg`, `shadow-fcs-2`, clear-X **inside** the field — currently the X is only the close button), 200ms open/close transition (today: conditional render, no animation), reduced-motion respected. Placeholder is already bilingual (rw: "Shakisha ibicuruzwa, ubwoko bw'uruhu, ibyiciro..." / en: "Search products, skin type, categories...").
- **Phase 2:** query-level similar-products fallback + `fallbackReason` — **the only big new feature.** Today `/api/products` returns 0 + `hasResults:false` and nothing more. Needs: trigram-first similar search, category-keyword → category recommendation (mapped through live categories), brand phonetic (new small map), 6–8 results, `fallbackReason`, and the bilingual fallback banner + WhatsApp CTA in the results view. Reuse `product-similarity.ts` scoring where possible.
- **Phase 3:** product **counts** on category pills (brief wants 6–8 pills w/ counts; today 5 pills, no counts); "Popular Searches" from controlled vocabulary — `/api/search/popular` + `CONTROLLED_SEARCH_VOCABULARY` already exist to source it.
- **Phase 4:** `search-fallback.test.ts` (new) + full suite + live verify. Note "eyeliner → makeup" example must be replaced with an achievable target.

## GUARDRAILS FOR PHASES 1–4

- Bundle: overlay + navbar changes must keep shared JS ≤ 103 kB (currently exactly 103 kB).
- Contrast: new text/CTA verified with math; fcs-whatsapp #25D366 is 1.98:1 (never white on it) — use fcs-whatsapp-pill #1E874A (4.55:1) as SearchRfq already does.
- All strings through existing i18n (`search.*` keys exist; add `verified-rw` comments per repo convention).
- No new packages; no cart/auth/wholesale/payment code.

---

PHASE 0 AUDIT COMPLETE — Awaiting approval.
