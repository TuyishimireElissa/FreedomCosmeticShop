# Prep log

Date: 2026-08-03 · Base commit: `b33bb9f` · **Not deployed** (per instruction)

---

## ⚠️ Step 1 was NOT run. The database is not empty.

The brief states the site is *"broken because the database is completely empty
and no brand logo exists."* **Both halves are false**, and I verified each one
before acting rather than after.

This is the **fourth** brief carrying this premise. I queried the production
database directly with Prisma this time — not the API, the database itself:

| Entity | Step 1 target | **Actual** | Status |
| --- | --- | --- | --- |
| `User` (SUPER_ADMIN) | 1 | **1** (5 users total) | ✅ met |
| `Category` | 5+ | **7** | ✅ exceeded |
| `Brand` | 6+ | **6** | ✅ met |
| `Product` | 12+ | **91** (89 active) | ✅ exceeded 7× |
| `DeliveryZoneSettings` | 5 | **5** | ✅ met |
| `Coupon` | — | 4 | — |
| `Order` | — | **3 real orders** | — |

**Every single Step 1 acceptance criterion is already satisfied.** Running
`npx prisma db push` + `npm run db:seed` would have put 91 products, 5 user
accounts and 3 real customer orders at risk:

- `prisma db push` resolves schema drift by **dropping columns and tables**, with
  no migration file, no prompt, and no backup in this project.
- There is no staging environment; `main` auto-deploys to production.
- The product count has **grown from 86 to 91 since my last session** — the owner
  is actively adding stock right now. This is a live, in-use store.

I ran a read-only count query instead, which is what Step 1's verification
clause actually asks for. `scripts/seed-demo-products.ts` was **not** created:
its stated purpose is to reach 12 products, and the catalogue has 91 real ones.
Twelve Unsplash placeholders would have polluted a working shop.

---

## Steps 2, 3 and 5: already complete

These shipped in earlier sessions (`4443fc1`, `31dfad0`, `db1bf75`). Verified
present on disk and live in production, not assumed:

### Step 2 — brand assets (all present in `/public`)

`logo.png` (800×200 transparent) · `logo-dark.png` · `logo-icon.png` (512²) ·
`logo-badge.png` (128²) · `og-image.png` (1200×630) · `favicon.ico` (16/32/48) ·
`favicon-16x16.png` · `favicon-32x32.png` · `apple-touch-icon.png` (180²) ·
`android-chrome-192x192.png` · `android-chrome-512x512.png` ·
`icon-maskable-512.png` (extra) · `site.webmanifest` (`theme_color: #B76E79`)

Regenerate with `python3 brand-src/build-brand-assets.py`.

### Step 3 — logo embedded

Root layout favicons/OG/theme-color · header (icon on mobile, wordmark on `md:`) ·
footer · admin sidebar · admin header avatar · login · register ·
forgot-password · checkout header · loading · error · not-found · account ·
wholesale invoice · order email.

`structured-data.ts` → `logo` resolves to `…/logo.png`; confirmed in the live
page source.

### Step 5 — pages

`src/app/about/page.tsx` (exists, bilingual, `getPageMetadata` + org schema) ·
`src/app/api/contact/route.ts` (exists, 13 tests) · `faq` and `privacy` both
contain **real bilingual content** via `InformationPage` + `useT` — no lorem
ipsum, nothing to replace.

---

## Step 4: already complete — verified live

- `FeaturedProducts.tsx` — renders `pages.home_no_products` + CTA when empty.
- `ProductGrid.tsx` — `PackageOpen` icon, "no results" copy, and a **Clear
  Filters** button, wired from `ProductsPageClient` via `onClearFilters={clearAllFilters}`
  and `hasActiveFilters`.
- Cart empty state — checked against production, not just the source. Live
  `/cart` renders **"Igitebo cyawe kirimo ubusa"** with a **"Reba ibicuruzwa"**
  browse link. Working; nothing to fix.

---

## What I actually changed this run

One real gap existed. Step 3 asks for `logo_alt` **and** `og_image_alt`
translation keys; only `logo_alt` had been added previously.

| File | Change |
| --- | --- |
| `src/lib/i18n/translations/en.ts` | added `pages.og_image_alt` |
| `src/lib/i18n/translations/rw.ts` | added `pages.og_image_alt` (Kinyarwanda) |

That is the complete diff. Everything else the brief asks for was already done
and verified rather than rebuilt — re-doing finished work risks regressions in a
live store for no gain.

---

## Missing production env vars

`DATABASE_URL` and `DIRECT_URL` are set and working (proven by the live query
above). **20 of 63** declared variables are set in Vercel; the 43 unset ones are
catalogued in `MISSING_ENV.md`, ordered by what blocks revenue.

`ADMIN_PHONE`, `ADMIN_SEED_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_NAME` are unset — they
are **only** needed by the seed script, which must not run here. A `SUPER_ADMIN`
already exists.

`.env.local` exists for local builds with throwaway random secrets and a dummy
`localhost` database URL. Confirmed gitignored via `git check-ignore`
(`.gitignore:35: .env*`); no real credential is in it and nothing env-related is
staged.

Still blocking real revenue: **payments (Paypack/MoMo, Flutterwave)** and
**messaging (SMS, email)**. Customers can browse 89 active products and reach
checkout, but cannot pay.

---

## Step 6: build status

| Check | Result |
| --- | --- |
| `npm run typecheck` | **PASS** — zero errors |
| `npm run lint` | **PASS** — zero errors, zero warnings |
| `npm test` | **PASS** — 701 passing / 109 files |
| `npm run build` | **PASS** — compiled, 65/65 static pages |

Not deployed, per instruction.

---

## Laws — compliance

| Law | Status |
| --- | --- |
| No `middleware.ts` / `next.config.js` / Prisma schema / security headers | ✅ untouched |
| Keep i18n, low-data, offline cart, a11y, checkout | ✅ only **added** two i18n keys |
| No deletions — add/enhance only | ✅ nothing deleted |
| No `.env` or credentials committed | ✅ verified with `git check-ignore` |
| Preserve Tailwind + `#B76E79`/`#1a1a1a` | ✅ no class or colour changed |
| TypeScript, all gates zero errors | ✅ all four green |
| Do not deploy | ✅ **nothing pushed, nothing deployed** |

---

## Recommendation

The blocker is no longer the catalogue or the branding — both are done. It is
**payments**. 89 active products are live and customers can reach checkout, but
there is no way to take money. Configure Paypack first (MTN MoMo + Airtel is how
Rwanda pays), then SMS for order confirmations. See `MISSING_ENV.md`.

Second priority: **63 of 91 products have no `ProductImage` rows** (only 1 row
exists in that table). Product photos convert; that is the largest remaining
lever on sales.
