# Structured data — Phase 0 audit (read only)

Audited against the live site and the live database on 2026-08-18.
No code written. No files changed.

---

## Headline

**The brief assumes we are starting from zero. We are not.** A structured-data
library already exists at `src/lib/structured-data.ts` (275 lines, 8 exported
builders) and is wired into 6 pages. Organization, Store, WebSite, Product,
BreadcrumbList, Article, FAQ and ItemList builders are all written and tested
(8 tests in `src/lib/__tests__/structured-data.test.ts`).

Roughly **60% of what the brief asks for is already live and working.** The
real gaps are narrower and different from what the brief describes, and
several things the brief asks me to add would be **false statements about the
business** if I added them as written. Details in Section 9 and Section 11.

---

## SECTION 1 — Current structured data

| File | Line | Emits |
|---|---|---|
| `src/app/layout.tsx` | 70 | Organization, Store, WebSite — on **every page** |
| `src/app/products/[slug]/page.tsx` | 97 | Product + BreadcrumbList |
| `src/app/products/page.tsx` | — | BreadcrumbList |
| `src/components/products/ProductsPageClient.tsx` | 225 | ItemList (**client-side only** — see Section 8) |
| `src/app/blog/[slug]/page.tsx` | 87 | Article + BreadcrumbList |
| `src/app/about/page.tsx` | 19 | Organization |

Renderer: `src/components/seo/StructuredData.tsx` — escapes `<` to `\u003c` so
a product name cannot break out of the script tag. Already correct.

Builders in `src/lib/structured-data.ts`:

| Function | Line | Status |
|---|---|---|
| `getOrganizationSchema` | 34 | live |
| `getLocalBusinessSchema` | 65 | live |
| `getWebsiteSchema` | 94 | live, SearchAction already points at real URL |
| `getProductSchema` | 117 | live |
| `getBreadcrumbSchema` | 181 | live |
| `getFAQSchema` | 195 | **written but rendered nowhere** |
| `getArticleSchema` | 210 | live |
| `getItemListSchema` | 248 | live but client-only |

### Verified live output

```
Homepage            3 blocks: Organization, Store, WebSite      all valid JSON
Product page        5 blocks: Organization, Store, WebSite, Product, BreadcrumbList
Category page       4 blocks: Organization, Store, WebSite, BreadcrumbList
FAQ page            3 blocks: Organization, Store, WebSite      (no FAQPage)
```

Product schema currently emits: `@context @id @type description image name
offers sku url`, and `offers` carries `@type availability itemCondition price
priceCurrency seller url`.

---

## SECTION 2 — Product pages

Server component: `src/app/products/[slug]/page.tsx`. Query at lines 9–35.

Available and already used: `name, slug, description, shortDescription, price,
stock, sku, barcode, images, productImages[], brand.name, category.name/slug,
reviews.rating`.

Available in the model but **not selected**: `size` (line 319), `volume` (299),
`volumeMl` (300), `weightGrams` (301), `shades` (313), `compareAt` (279),
`realSku` (287).

### Live database coverage (116 active products)

| Field | Populated | Usable for schema |
|---|---|---|
| `sku` | 116 / 116 | yes |
| `size` | 107 / 116 | yes, 92% |
| `volume` | 111 / 116 | yes, 96% |
| `shades` | 115 / 116 | `color` candidate |
| `brand` | **2 / 116** | **no — 1.7%** |
| `barcode` | **0 / 116** | **no** |
| `weightGrams` | **0 / 116** | **no** |

**Two findings that change the plan:**

1. **`brand` is populated on 2 of 116 products.** The brief's Phase 1 schema
   lists `brand` as required. Google does treat it as required for Product
   rich results. 114 products cannot supply it truthfully. Inventing one
   ("FreedomCosmeticShop" as brand) would be a false manufacturer claim.

2. **`barcode` is empty on all 116 products,** so `gtin` never emits. The
   existing `getKnownGTIN` helper (page.tsx:110) is dead code today. `mpn`
   would have to fall back to SKU, which the brief itself suggests — that is
   defensible since our SKU *is* our part number.

---

## SECTION 3 — Reviews

`model Review` at `prisma/schema.prisma:866`. Rating is `Int` 1–5, validated
by the API. Gated by `isApproved && isVerified && !isHidden && !isDeleted`.

**Live count: 0 reviews. Total, across all products.**

The product page already aggregates correctly (page.tsx:69–72) and
`getProductSchema` already refuses to emit `aggregateRating` without
`source: 'database'` and a count > 0 (structured-data.ts:134–139). Verified on
the live product page: `aggregateRating` correctly **absent**.

This means the brief's "Add if reviews exist" block is **already implemented
and currently a no-op**. Nothing to do. Do not add star ratings — there are no
stars to show, and faking them is a manual-action risk.

---

## SECTION 4 — Categories

- BreadcrumbList: **yes**, server-rendered, confirmed live.
- CollectionPage: **no**.
- ItemList: exists but **client-only** — see Section 8.

Category pages are `/products?category=<slug>`, a query param on a single
route, not `/category/<slug>`. Any CollectionPage work must handle that.

---

## SECTION 5 — Business schema

Organization **and** Store (a LocalBusiness subtype) both already ship on every
page. `src/lib/seo-config.ts:34–108` is the single source, and it deliberately
omits unconfirmed values rather than inventing them:

- `legalName` — omitted, still `OWNER_TODO`
- `sameAs` — empty array, no social accounts confirmed
- `geo`, `openingHours` — explicitly `undefined` with a comment saying they stay
  absent until owner-confirmed
- `streetAddress` — omitted, `OWNER_TODO`
- `addressRegion` — **"Nyarugenge"**, present
- `paymentAccepted` — sourced from `ACCEPTED_PAYMENTS_SCHEMA` so Google is never
  told we accept a method we cannot process

Present and correct: name, url, logo, email, telephone, contactPoint with
`areaServed: RW` and `availableLanguage: [Kinyarwanda, English]`, address
locality Kigali, country RW, `currenciesAccepted: RWF`.

**The brief's Phase 2 block is ~95% already live.** The three differences are
in Section 11.

---

## SECTION 6 — SEO metadata

`getPageMetadata()` at `src/lib/seo-config.ts:110`. Every page type gets:
absolute title, description, keywords, canonical, full Open Graph (title,
description, url, siteName, locale `rw_RW`/`en_RW`, type, 1200×630 PNG image),
Twitter `summary_large_image`, and robots index/noindex.

Search-result pages are correctly `noIndex` (`products/page.tsx:53`).
`twitterHandle` is `undefined` — correct, no account confirmed.

No gaps found here.

---

## SECTION 7 — Sitemap and robots

`src/app/sitemap.ts`, `revalidate = 3600`. Includes 13 static routes plus all
active products, categories, published blog posts and bundles.

**`lastModified` is present on every dynamic URL** (product, category, blog,
bundle) sourced from `updatedAt`. The brief asks whether product URLs include
lastmod — they do.

`src/app/robots.ts` disallows `/admin /account /api /cart /checkout /login
/register /forgot-password /change-password` plus `*?*search=*`, `*?*q=*`,
`*?*utm_*`. Blocks `GPTBot` and `CCBot`. Declares sitemap and host.

No gaps found here.

---

## SECTION 8 — Google Rich Results compatibility

| Page | Googlebot sees today |
|---|---|
| Homepage | Organization, Store, WebSite + Sitelinks SearchBox |
| Product | Organization, Store, WebSite, **Product**, BreadcrumbList |
| Category | Organization, Store, WebSite, BreadcrumbList — **no ItemList** |
| Search | same as category, `noindex` |
| Blog post | Organization, Store, WebSite, Article, BreadcrumbList |

### The ItemList problem

`ProductsPageClient.tsx` is `'use client'` (line 1) and loads products through
`fetch('/api/products')` in a `useEffect` (line 106). The ItemList schema is
built from that state, so **it does not exist in the server HTML**.

Confirmed by fetching the live category page: the only `itemListElement` in the
HTML belongs to BreadcrumbList. Zero product names in the SSR payload.

Google's structured-data crawler generally does not execute JavaScript. **This
schema is very likely invisible to Google today.** This is the single biggest
real gap in the audit, and it is not in the brief's phase list.

---

## SECTION 9 — What's missing for Google Shopping

| Google requirement | Status |
|---|---|
| `name` | present |
| `image` | present |
| `description` | present |
| `sku` | present, 116/116 |
| `brand` | **2/116 — cannot be fixed with real data** |
| `offers.price` | present |
| `offers.priceCurrency` | present, RWF |
| `offers.availability` | present, stock-derived |

| Google recommendation | Status |
|---|---|
| `aggregateRating` / `review` | correctly omitted — 0 reviews exist |
| `gtin` | **0/116 barcodes** — never emits |
| `mpn` | missing; SKU fallback is legitimate |
| `color` | `shades` on 115/116 — candidate |
| `size` | `size` on 107/116 — candidate |
| `material` | not in the model |
| `shippingDetails` | **missing** |
| `hasMerchantReturnPolicy` | **missing** |
| `priceValidUntil` | **missing** |
| `itemCondition` | already present |
| `seller` | already present |

---

## SECTION 10 — Files that would change

| File | Change |
|---|---|
| `src/lib/structured-data.ts` | extend `getProductSchema`; add CollectionPage builder |
| `src/app/products/[slug]/page.tsx` | select `size`/`volume`; pass new fields |
| `src/app/products/page.tsx` | **server-render** ItemList + CollectionPage |
| `src/app/faq/page.tsx` | render existing `getFAQSchema` |
| `src/lib/__tests__/structured-data.test.ts` | extend |

The brief proposes four **new** files — `src/lib/schema/product-schema.ts`,
`organization-schema.ts`, `breadcrumb-schema.ts`, `collection-schema.ts`.
Creating them would duplicate `src/lib/structured-data.ts`, which already
exports all four builders, and would violate safety rule 10 (extend, never
duplicate). **Recommend extending the existing module instead.**

---

## SECTION 11 — Errors in the brief

Flagging these before writing code, per rule 13.

**1. `shippingRate` flat 1,000 RWF is wrong.** Real fees from
`src/lib/constants.ts:24` and confirmed against the live
`/api/delivery/calculate`: Kigali 1,000 · Northern 3,000 · Southern 3,000 ·
Eastern 3,500 · Western 4,000. Publishing a flat 1,000 RWF to Google would
under-quote delivery for every customer outside Kigali. There is also a free
delivery threshold of 50,000 RWF that the brief does not mention.

**2. `returnMethod: ReturnByMail` is false.** This shop delivers by courier and
takes orders over WhatsApp. There is no mail-return process anywhere in the
codebase or the policy copy.

**3. `returnFees: FreeReturn` is unverified.** Nothing in the site promises free
returns. Claiming it in schema is a commitment the owner has not made.

**4. `merchantReturnDays: 7` is only half the policy.** The live FAQ
(`en.ts:1692`) says *unopened, unused* products may be eligible within 7 days,
and that **opened personal-care items normally cannot be returned at all** for
hygiene reasons. A flat 7-day return window overstates it.

**5. `"@type": "OnlineStore"` in Phase 2.** We currently emit `Organization` +
`Store`. `OnlineStore` is a newer type with thinner support. Switching risks
regressing what already validates, for no clear gain.

**6. `logo.png`.** The brief hardcodes `https://freedomcosmeticshop.com/logo.png`.
That is already what `seo-config.ts:76` produces. No change needed — but worth
confirming the asset returns 200 before we lean on it harder.

**7. `fcs-surface` and `fcs-charcoal` in the design-system block.** Same two
errors as the previous engagement: the real token is `--fcs-surface: #FAF8F6`
(not `#F9F3EA`), and `fcs-charcoal` does not exist — the token is `fcs-text`
`#1a1a1a`. Not relevant to JSON-LD, but noting it so it does not get copied
into future CSS work.

---

## Recommended plan

Reordered by actual impact, differing from the brief:

1. **Server-render the category ItemList** (Section 8). Biggest real win — the
   schema exists but Google cannot see it.
2. **Add `shippingDetails` with real per-province rates**, not a flat 1,000.
3. **Add `hasMerchantReturnPolicy`** matching the real policy: 7 days, unopened
   only, no free-return or mail-return claim.
4. **Add `priceValidUntil`** (30 days) and **`mpn`** (SKU fallback).
5. **Add `size` / `color`** from `size` and `shades`.
6. **Render the existing `getFAQSchema`** on `/faq`.
7. **Add CollectionPage** to category pages.

Not doing, with reasons: no `brand` invention (2/116 real), no `gtin` (0/116),
no `aggregateRating` (0 reviews), no new `src/lib/schema/*` files (duplicates
existing module), no `OnlineStore` switch.

**Open question for the owner:** are returns free, and is there any return
method other than "contact us on WhatsApp"? I will not publish a return policy
to Google that the shop has not actually committed to.

---

PHASE 0 AUDIT COMPLETE — Awaiting approval.
