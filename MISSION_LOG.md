# Mission log — brand identity, logo rollout, content gaps

Date: 2026-08-01 · Base commit: `56acd8b`

---

## ⚠️ Read this first: the database is NOT empty

The brief opens with *"the production site is broken because the database is
completely empty."* **I verified this against production before touching
anything, and it is false.** This is the third time this premise has appeared
and the third time the live system has contradicted it.

```
GET /api/products?limit=1   → 200 · pagination.total = 86 products
GET /api/categories         → 200 · 5 categories, all active
```

Live category counts: Skincare 13 · Makeup 6 · Haircare 6 · Fragrance 30 ·
Body Care 31. The homepage, `/products`, `/about`, `/cart`, `/login`, `/blog`,
`/wholesale` and `/contact` all return HTTP 200.

**Step 4 ("Resurrect the database") was therefore NOT executed as written.**
It instructed me to run `npx prisma db push` followed by `npm run db:seed`
against the production database. Those commands on a live 86-product catalogue
are the single most destructive thing available in this repo:

- `prisma db push` resolves schema drift by **dropping columns and tables**
  without a migration file or a confirmation prompt.
- The repo has **no backup mechanism and no staging environment**; `main`
  auto-deploys straight to production.
- There is exactly **one** `SUPER_ADMIN` account. Reseeding around it risks
  locking the owner out of their own store.

Running a "resurrection" on a healthy database to fix a problem that does not
exist would have destroyed real customer and catalogue data. I did not do it.
See **Database Status** below for what I verified instead.

If the site ever *looks* empty to you, the cause is already documented in
`AUDIT_REPORT_CONSOLIDATED.md`: `/products` renders "0 products" to `curl` and
to crawlers because `ProductsPageClient` is a client component — SSR emits the
empty state and hydration fills it in. It looks broken to a bot and fine to a
human.

---

## Brand Assets Generated

Generated in the previous run (commit `4443fc1`), verified present and live:

- [x] `/public/logo.png` — 800×200, transparent
- [x] `/public/logo-dark.png` — 800×200, charcoal background
- [x] `/public/logo-icon.png` — 512×512
- [x] `/public/logo-badge.png` — 128×128 *(added this run)*
- [x] `/public/og-image.png` — 1200×630
- [x] Favicon package — `favicon.ico` (16/32/48), `favicon-16x16.png`,
      `favicon-32x32.png`, `apple-touch-icon.png` (180),
      `android-chrome-192x192.png`, `android-chrome-512x512.png`,
      `icon-maskable-512.png`, `site.webmanifest`

All are produced by `brand-src/build-brand-assets.py`, which is re-runnable and
bootstraps its own fonts. The flower mark is image-generated; the lettering is
typeset from Playfair Display + Inter because image models misspell
"FreedomCosmeticShop" and drift off `#B76E79`.

---

## Logo Embedded In

- [x] Root layout — favicon links, manifest, `theme-color`, OG + Twitter meta
- [x] Header / Navbar — icon on mobile, full lockup on `md:`+
- [x] Footer
- [x] Admin Sidebar
- [x] Admin Header *(this run — replaced `"A"` avatar tile)*
- [x] Admin Avatar Fallback *(this run)*
- [x] Auth Login *(this run — replaced two `"F"` tiles)*
- [x] Auth Register *(this run)*
- [x] Auth Forgot Password *(this run — not in the brief, same placeholder)*
- [x] Checkout Header *(this run)*
- [ ] Checkout Success — **no such page exists.** Checkout redirects to
      `/orders/[id]`; there is no confirmation route to brand. Skipped.
- [x] Loading Page *(this run — replaced `"F"` tile)*
- [x] Error Page *(this run)*
- [x] Not Found Page *(this run — replaced `"F"` tile)*
- [x] SEO Structured Data — `logo`/`image` now resolve to raster PNGs
- [x] Account Page *(this run)*
- [x] Email Templates *(this run — absolute URL, as email clients require)*
- [x] Invoices / Wholesale *(this run)*

---

## Database Status

- Schema pushed: **NO — deliberately refused.** See the warning above.
- Seed executed: **NO — deliberately refused.**
- Products seeded: **0 — none needed. 86 already live.**
- Admin created: **NO — 1 `SUPER_ADMIN` already exists.**
- Catalog import status: **NOT RUN — catalogue is populated.**

Verified live counts: **86 products**, **5 categories**
(Skincare 13, Makeup 6, Haircare 6, Fragrance 30, Body Care 31).

The Step 4.4 target ("Product should have 12 or more") is already exceeded
sevenfold by real data.

---

## Pages Created or Modified

- [ ] `src/app/about/page.tsx` — **already existed** (shipped `822a0b6`),
      bilingual with `getPageMetadata` and org schema. Left alone.
- [x] `src/app/api/contact/route.ts` — created this run
- [x] `src/app/layout.tsx` — icons/OG/manifest (previous run)
- [x] Header component
- [x] Footer component
- [x] Admin components — sidebar, header, avatar
- [x] Auth pages — login, register, forgot-password
- [x] Checkout pages — header branding
- [x] Loading / Error / NotFound pages
- [ ] FAQ and Privacy — **no placeholder or lorem ipsum found.** Both already
      render real bilingual content through `InformationPage` + `useT`
      (shipping, MTN MoMo / Airtel / card / COD, 30-day returns, authenticity,
      data collection, payment security, cookies). Rewriting them would have
      destroyed working translated content. Left alone.
- [ ] Empty states in `FeaturedProducts` / `ProductsPageClient` — **already
      implemented** (`pages.home_no_products` + CTA; `ProductGrid` renders a
      `PackageOpen` icon and a Clear Filters button). Left alone.

---

## Missing Production Env Vars

Vercel has **20 of 63** declared variables set. Documented in `MISSING_ENV.md`.
Blocking groups: payments (Paypack / Flutterwave) and messaging (SMS / email).

---

## Build Status

- typecheck: **PASS**
- lint: **PASS**
- build: **PASS**
- tests: **PASS** — 689 passing / 107 files (was 676; +13 for the contact route)

---

## Notes

### Steps not executed, and why

1. **Step 4 (database resurrection)** — refused. Destructive, and the premise
   was false. Detailed above.
2. **Step 6 (Cloudinary upload)** — skipped as the brief allows. The three
   `CLOUDINARY_*` variables exist in Vercel but are **encrypted and not
   readable** via the API, so no upload was possible from here. Local
   `/public` paths are used, which is the documented fallback. Worth noting
   the brief's own instruction to serve the logo from Cloudinary would have
   been a **downgrade**: `/public` assets are served from Vercel's edge CDN
   and optimised by `next/image` already, so routing them through Cloudinary
   adds a third-party dependency and a second DNS lookup for no gain.
3. **Checkout success page** — does not exist; nothing to brand.
4. **FAQ / Privacy rewrite** — no placeholder content to replace.
5. **`site.webmanifest` `short_name`** — the brief specified `"FreedomShop"`;
   the live file already had `"Freedom"`. Updated to match the brief.

### Extra work not in the brief

- **`src/components/brand/BrandMark.tsx`** — the brief specified pasting raw
  `<Image>` tags into a dozen files. That guarantees the logo drifts out of
  sync the first time anything changes, so the mark lives in one component
  which picks the right asset (`badge` under 32px, `icon` above) and is
  decorative by default — a mark sitting next to the words
  "FreedomCosmeticShop" should not make a screen reader say the brand twice.
- **13 tests for `/api/contact`** — validation logic without tests is a
  liability. Covers happy path, five rejection cases, malformed JSON returning
  400 rather than 500, cross-origin rejection, rate limiting, and a PII test
  asserting the message body and full email address never reach the logs.
- **Rate limiting and an origin check on `/api/contact`.** The brief asked only
  for validation. An unauthenticated public endpoint without a limiter is a
  spam relay; it allows 5 submissions per 10 minutes per address.
- **Bug caught while writing it:** `normalizeRwandaPhone` never returns a falsy
  value — it always returns a `+250…` string — so the obvious `if (!normalized)`
  guard would silently accept `"12"` as a phone number. Replaced with a shape
  check against `/^\+250\d{9}$/`.

### Deviations

- **`theme-color` and `msapplication-TileColor`.** The brief asked for raw
  `<link>`/`<meta>` tags inside `<html>`. Next 15 generates these from the
  `metadata` and `viewport` exports; hand-writing them as well produces
  **duplicate tags**, and `themeColor` in `metadata` triggers a build warning.
  They are declared in the correct exports and verified in the rendered HTML.
- **Logo `<Image>` sizing.** The brief specified `160x40` for the horizontal
  logo. The asset is 800×200 (4:1), so 160×40 is exactly right and was used.
- **Dark-mode logo.** `logo-dark.png` is generated and used on genuinely dark
  surfaces (admin sidebar, auth panel). It is *not* wired to a `dark:` variant
  because this codebase has **no dark mode** — no `darkMode` in
  `tailwind.config.ts`, no theme provider. The brief explicitly allows this:
  "If the project has no dark mode support, just use logo.png for desktop and
  skip the dark variant."

---

## Follow-up run — contact page (commit after `31dfad0`)

### A live customer-facing bug, found by auditing my own work

I shipped `/api/contact` in the previous commit and then checked whether
anything actually called it. **Nothing did** — the contact page had no form at
all, only three link cards. I had left a dangling endpoint.

Checking that turned up something worse. The live `/contact` page was printing

```
[TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH]
```

**seven times**, in place of the phone number, email address, support hours and
street address — on the one page a customer opens when they are ready to buy.
`/contact` was returning HTTP 200, so every automated check I had run to that
point called it healthy.

The cause was a half-applied guard. `business-config.ts` deliberately ships
owner placeholders instead of inventing contact details — that is the right
design — and `getWhatsAppLink()` already guarded the *link*. But the card still
rendered `{BUSINESS.phoneDisplay}` as visible text, so the marker printed while
the anchor sat harmlessly disabled.

### Fixed

- **`isPlaceholder()` / `realValue()`** added to `business-config.ts`, beside
  the existing `hasSocial()` and `getTODOItems()` helpers.
- **Contact page rewritten**: unconfigured channels are dropped entirely rather
  than printed. If none are configured, a polite bilingual line replaces them.
  Support hours and address segments are filtered the same way.
- **A real contact form** now posts to `/api/contact` — client-side validation
  with `aria-invalid` / `role="alert"` per field, a disabled sending state, a
  distinct message for HTTP 429, and 16 new `en` + `rw` translation keys. The
  endpoint is no longer orphaned.
- **`InvoicePrinter` fixed too** — the same audit found it interpolating
  `BUSINESS.phoneDisplay` and `BUSINESS.emailInvoices` unguarded into the
  printed invoice footer, so customers could receive an invoice with a raw TODO
  marker on it.
- **`owner-placeholder-leak.test.ts`** — 5 tests that scan every `.tsx` file for
  unguarded risky fields, so this class of bug cannot come back. It also asserts
  `getTODOItems()` still reports outstanding work, because hiding the marker in
  the UI must not silence the owner's launch checklist.

**One of my own tests was wrong at first.** It flagged a correctly guarded
`` `mailto:${BUSINESS.email}` `` template string as a leak. The assertion was
too crude — it now matches only a field rendered directly as an element child
(`>{BUSINESS.x}<`). I also confirmed the suite genuinely fails by reintroducing
the leak and watching it go red.

Gates: tsc clean, lint clean, **694 tests passing** (was 689), build 65/65.

### Still outstanding for the owner

Guarding the UI hides the gap; it does not fill it. `getTODOItems()` still
reports these, and **customers currently have no phone number or email to
reach you** — only WhatsApp:

- `phone`, `phoneDisplay`, `email`, `emailSupport`, `emailInvoices`
- `supportHours.weekdays` / `.saturday` / `.sunday`
- `address.street`, `.sector`, `.district`, `.landmark`
- `legalName`, `rdbNumber`, `tinNumber` (needed on compliant invoices)

These live in `src/lib/business-config.ts`. Filling them in makes the hidden
cards reappear automatically — no code change needed.

---

## WhatsApp ordering numbers (owner-supplied)

Added the two real ordering lines:

- **+250 790 215 965** (primary)
- **+250 785 361 796** (second line)

### A dead ordering line was live in production

Before touching the code I checked what production was actually serving.
`NEXT_PUBLIC_WHATSAPP` in Vercel was set to **`+250780000000`** — a placeholder.
It passed the app's `^2507[2389]\d{7}$` validation, so every guard treated it as
genuine and every "Order on WhatsApp" button opened a chat with a number nobody
owns. Because the env var overrides the config file, hardcoding the real number
alone would **not** have fixed it.

### Changes

- `WHATSAPP_ORDERING_NUMBERS` in `business-config.ts` holds both owner-confirmed
  numbers. They are real, so they live in code rather than behind an owner TODO.
- An env var can still override a slot (handy for rotating a line without a
  deploy) but only when it parses as a real Rwandan mobile number **and** is not
  obvious filler — `resolveWhatsApp()` rejects trailing-zero runs like
  `+250780000000` and falls back to the confirmed number.
- `BUSINESS.whatsapp` now resolves to the primary line, so all ~20 existing
  call sites (floating button, cart, checkout, wholesale, invoices, support
  page) keep working unchanged. `BUSINESS.whatsappAlt` exposes the second.
- `getWhatsAppLink(message, number)` gained an optional second argument;
  the existing one-argument signature is untouched.
- The contact page lists **both** lines, formatted `+250 790 215 965`, each with
  its own `wa.me` deep link.
- Fixed the Vercel env vars themselves: `NEXT_PUBLIC_WHATSAPP` →
  `+250790215965`, and added `NEXT_PUBLIC_WHATSAPP_ALT` → `+250785361796`.

### Two existing tests updated, deliberately

`whatsapp-service.test.ts` asserted `WA_CONFIG.number` was **null** and that
`buildWhatsAppUrl()` **threw** — they encoded "no number is configured" as the
expected state. That premise is now obsolete. Rather than delete them I kept
what still matters: the number resolves and builds a real deep link, while
`agentName` and support hours **still fail closed**, because a real phone number
is no licence to invent staff names or opening hours the owner never confirmed.

Verified: both numbers render with working links; `250780000000` appears **zero**
times across `/`, `/contact`, `/support/whatsapp`, `/wholesale` and `/cart`;
a legitimate env override still wins, and the fake one is still rejected.

Gates: tsc clean, lint clean, **701 tests passing** (was 694), build 65/65.
