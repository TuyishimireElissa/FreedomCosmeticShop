# Structured data — completion record

**Status:** shipped and verified live at <https://freedomcosmeticshop.com>
**Deployed commit:** `e9738d9`
**Date:** 2026-08-18

---

## Commits

| Commit | Phase | What |
|---|---|---|
| `2182bc2` | 1 | Real shipping, return policy, priceValidUntil, mpn, size |
| `8069004` | 2 | Organization description + addressRegion |
| `9a5e2b5` | 3 | Blog breadcrumb routed through /blog |
| `3d76c54` | 4 | Server-rendered CollectionPage + ItemList |
| `e9738d9` | 5 | FAQPage from a shared question list |

No new packages. Shared JS **103 kB, unchanged**.

---

## Live verification

| Page | Schemas in server HTML |
|---|---|
| `/` | Organization, Store, WebSite |
| `/products/[slug]` | Organization, Store, WebSite, **Product**, BreadcrumbList |
| `/products?category=soap` | Organization, Store, WebSite, BreadcrumbList, **CollectionPage** |
| `/faq` | Organization, Store, WebSite, **FAQPage** |

**Schema.org validator: 0 errors, 0 warnings** on the product page and the
category page.

### Live product schema

```
price 1000 RWF · InStock · priceValidUntil 2026-09-17
mpn DET-SO-001 · size 100 g
shipping zones 1000 / 3000 / 3500 / 4000 RWF
returns 7 days · aggregateRating absent (correct — 0 reviews)
trail  Ahabanza > Ibicuruzwa > Soap > Dettol Original Antibacterial Soap 100g
```

### Live category schema

```
Isabune · numberOfItems 33 · 20 listed
trail  Ahabanza > Ibicuruzwa > Isabune
```

### Google Product requirements

| Required | Status |
|---|---|
| name, image, description, sku, offers | present |
| offers.price / priceCurrency / availability | present, RWF, stock-derived |
| brand | **omitted — only 2 of 116 products have one** |

| Recommended | Status |
|---|---|
| priceValidUntil, itemCondition, seller | present |
| shippingDetails, hasMerchantReturnPolicy | present |
| mpn, size | present |
| aggregateRating, review | absent — zero reviews exist |
| gtin | absent — zero barcodes exist |

---

## The biggest fix wasn't in the brief

**The category ItemList was invisible to Google.** It was built inside
`ProductsPageClient`, a client component that fetches in `useEffect`, so the
schema only existed after JavaScript ran. Google's structured-data crawler
does not run that JavaScript. Verified before the fix: zero product names in
the category page's server HTML.

It is now built on the server from the database as a `CollectionPage`.

**A second bug found along the way:** category breadcrumbs were driven by
`CATEGORY_SEO`, a hand-written 5-entry map. **Soap — the second-largest shelf
with 33 live products — was not in it**, so it published a breadcrumb with no
category level at all. The trail now falls back to the database name and
renders "Isabune".

---

## Errors in the brief

| # | Brief said | Reality |
|---|---|---|
| 1 | Flat `shippingRate` 1,000 RWF | Kigali-only rate. Real: 1,000 / 3,000 / 3,500 / **4,000**. Would have under-quoted every non-Kigali customer by 2,000–3,000 RWF. Now 4 zones. |
| 2 | `returnMethod: ReturnByMail` | **False.** Courier delivery, WhatsApp orders. No mail-return exists. Omitted. |
| 3 | `returnFees: FreeReturn` | **Unverified.** Nothing promises free returns. Omitted. |
| 4 | `merchantReturnDays: 7` | Kept, but the FAQ also says opened personal-care items normally can't be returned at all. Schema.org can't express that nuance. |
| 5 | 4 new `src/lib/schema/*` files | Would duplicate `structured-data.ts`, which already had every builder. Extended it instead. |
| 6 | `@type: OnlineStore` | Not done. Organization + Store already validate; switching risks regression for no gain. |
| 7 | `SiteNavigationElement` | Not done. Google hasn't used it for sitelinks in years. |
| 8 | "Rwanda's leading cosmetics store" | Unprovable superlative. Used the factual description; added a test that fails on *leading/best/#1/largest*. |
| 9 | `fcs-surface #F9F3EA`, `fcs-charcoal` | Real values: `#FAF8F6`, and `fcs-charcoal` doesn't exist (it's `fcs-text`). Same errors as last engagement. |

### The big one: FAQ rich results no longer exist

Phase 5's goal cannot be achieved by anyone. From Google's own documentation:

- **Aug 2023** — restricted to government and health sites
- **May 7 2026** — removed from Google Search **entirely**
- **Jun 15 2026** — the documentation page itself deleted
- **Jun 2026** — dropped from the **Rich Results Test**
- **Aug 2026** — dropped from the Search Console API

All of that is already in the past. I implemented FAQPage anyway because Google
still reads it for page understanding, and Bing and the AI-answer crawlers
still parse it — but **it will not produce an FAQ dropdown**, and Phase 6's
plan to confirm it in the Rich Results Test cannot work.

---

## Errors I made and corrected

1. **Phase 0 audit said `shades` (115/116) could power `color`.** Wrong — 114
   are the empty array `"[]"`. Exactly **one** real value exists. `color` was
   dropped; `size` (107/116, genuine) was implemented instead.
2. **Phase 1 test gap:** nothing asserted the product page actually *selects
   and forwards* `size`. The builder could work while the page sent nothing.
3. **Phase 4 test gaps — 5 of 10 mutations initially escaped.** My tests
   covered the builder but almost nothing about the page wiring: dropping the
   ItemList type, emitting schema for empty shelves, emitting it on noindex
   search pages, removing the server-render call, removing the sample cap. All
   now asserted.

All were caught by mutation testing, not by review.

---

## Verification

- **2004 tests / 161 files pass**, up from 1974 at baseline. 30 new.
- **47 mutations** applied one at a time across all phases; every one caught.
  All files confirmed byte-identical afterwards with `diff -q`.
- Verified on the **real standalone server** (`output: standalone`), not
  `next start`.
- **Schema.org validator: 0 errors, 0 warnings.**
- Build 67/67 pages, `tsc` and `eslint` clean, **no new packages**.

### Performance

| Metric | Value |
|---|---|
| Shared JS | **103 kB — unchanged** |
| Product page HTML | 96,834 bytes |
| **Over the wire (gzip)** | **16,133 bytes** |
| JSON-LD share | 5.8% uncompressed |
| Added this engagement | ~2.1 KB/product page, mostly repetitive shipping blocks that gzip away |

---

## Owner actions — cannot be done from code

1. **Run the Rich Results Test manually** at
   <https://search.google.com/test/rich-results> for `/`, a product page, and
   `/products?category=soap`. There is no public API, so I could not automate
   this. Expect Product, Breadcrumbs and Organization to be detected; do **not**
   expect FAQ.
2. **Add `brand` to products.** Only 2 of 116 have one, and Google treats brand
   as required for Product rich results. This is the single biggest remaining
   blocker to rich cards, and it needs real data — I will not invent it.
3. **Add barcodes** if the distributor supplies them; `gtin` support is already
   written and will activate automatically.
4. **Collect reviews.** `aggregateRating` is already wired and will appear
   automatically once real approved reviews exist. Star ratings in search
   results are not possible until then.
5. Google Search Console: submit the sitemap, monitor the Products report.

### Known drift, not fixed

`DELIVERY_TIMES` in `src/lib/constants.ts` disagrees with
`delivery.service.ts` and the database (it claims 3–5 days for Eastern where
both others say 3). The schema follows the service, which is what the live API
answers with. `constants.ts` feeds unrelated UI and was out of scope.

---

ALL PHASES COMPLETE — Live verified.
