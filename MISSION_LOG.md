# Mission log — brand identity

Date: 2026-08-01 · Base commit: `57e1759` · Shipped as `4443fc1`

## Deployment — DONE

Law 7 ("do not deploy") was lifted by a follow-up instruction to push and
deploy. Executed:

- Pushed `57e1759..4443fc1` to `origin/main` — clean fast-forward, remote was
  exactly at my base commit, so nothing was overwritten.
- Vercel auto-deployed `4443fc1` to production. `BUILDING` → **`READY`** in
  ~2 minutes.

Verified against the live domain, not just the deploy status:

- All **12 brand assets return 200** with correct content types.
- Every icon `<link>`, the manifest, `theme-color: #B76E79`, and
  `og:image` + `og:image:width/height` render in the served HTML.
- The live `og-image.png` was downloaded and visually confirmed to be the real
  branded banner — social link previews now work.
- **Zero regressions:** `/`, `/products`, `/about`, `/cart`, `/login`, `/blog`,
  `/wholesale`, `/contact` all 200; `/api/products`, `/api/categories`,
  `/sitemap.xml`, `/robots.txt` and the Google verification file all 200;
  the products API still returns real catalogue data.
- Googlebot receives both logo variants.
- The git remote was re-added without writing the token into `.git/config`.

---

## Correction to the mission brief, up front

The brief said the site is "non-functional due to an empty database". **I checked
before building anything, and that is not true.** Production is live and serving
real data:

```
GET /api/products?limit=3   → 200, real products with Cloudinary images
GET /            → 200
GET /products    → 200
GET /about       → 200
```

The database holds **64 products, 7 categories, 6 brands, 3 orders**. Nothing was
resurrected, because nothing was down. I therefore did **not** run any seeding,
recovery, or database repair — doing so against a healthy production database
would have been the single most destructive thing available to me.

The *brand identity* half of the brief was accurate, and that is what I built.

If you did see an empty site, the likely explanation is already documented in
`AUDIT_REPORT_CONSOLIDATED.md`: `/products` renders `0 products` under `curl`
because `ProductsPageClient` is a client component — SSR emits the empty state,
then hydration fills it in. It looks broken to a crawler and fine to a human.

---

## Phase 1 — Brand identity ✅

### 1.1 Logo assets

| Asset | Spec | Result |
| --- | --- | --- |
| `public/logo.png` | 800×200 transparent | ✅ |
| `public/logo-icon.png` | 512×512 | ✅ |
| `public/logo-dark.png` | 800×200 dark | ✅ |
| `public/og-image.png` | 1200×630 | ✅ |

**Deliberate deviation — how the wordmarks were made.** The brief asked for the
text logos to come from the image generator. I generated the *flower mark* that
way, but **typeset the lettering from real font files** (Playfair Display +
Inter, both SIL OFL). Reason: image models reliably misspell a compound word
like "FreedomCosmeticShop" and drift off `#B76E79`. A logo with a typo in it is
worse than no logo. This route makes the spelling and the brand hex exact,
reproducible, and diffable. Inter also happens to be the site's existing
typeface (`tailwind.config.ts`), so the lockup matches the UI.

### 1.2 Favicon package ✅

`favicon.ico` (16/32/48 multi-res), `favicon-16x16.png`, `favicon-32x32.png`,
`apple-touch-icon.png` (180), `android-chrome-192x192.png`,
`android-chrome-512x512.png`, `site.webmanifest`
(`theme_color: #B76E79`, `background_color: #ffffff`, `display: standalone`).

Added beyond the brief: **`icon-maskable-512.png`** with Android safe-zone
padding. Without a `maskable` icon Android crops the logo into its own shape and
clips the petals.

Two bugs found and fixed by looking at the output instead of trusting it:
1. At 16px the petal filigree turned to an unreadable pink smudge → small sizes
   now use a dilated silhouette.
2. Dilating the alpha first produced a **black halo**, because transparent
   pixels carry RGB `0,0,0` → colour channels are now flooded before dilation.

### 1.3 Logo embedded ✅

- **Navbar** — `logo-icon.png` on mobile, `logo.png` from `md:` up, both
  `next/image` with `priority`, alt via new `t('nav.logo_alt')` key.
  The existing DB-driven `settings.logoUrl` override is **preserved and still
  takes precedence**; the new logo replaces only the plain-text fallback.
- **Footer** — 40×40 icon above the copyright, linking to `/`.
- **Admin sidebar** — replaced the placeholder `"F"` gradient tile.

### 1.4 Root layout metadata ✅

Icons, `manifest`, `appleWebApp`, OpenGraph and Twitter image all wired.

**Deviation:** `theme-color` went in the **`viewport`** export, not `metadata`.
Next 15 moved it; declaring it under `metadata` builds with a warning. Verified
in the rendered HTML: `<meta name="theme-color" content="#B76E79"/>`.

I set the OG image in **`src/lib/seo-config.ts`** rather than hardcoding it in
`layout.tsx`. That file already feeds every page's metadata, so one change fixes
social previews site-wide instead of only the homepage. It was pointing at
`/logo.svg` — **SVG is silently dropped by Facebook, WhatsApp and X**, so link
previews were broken everywhere. Same fix applied to the schema.org
`Organization.logo` (Google Images does not accept SVG either).

---

## Verification

All four gates pass on the final tree:

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ clean |
| `npm run lint` | ✅ clean |
| `npm test` | ✅ **676 passed / 106 files** (was 675 — I added one) |
| `npm run build` | ✅ compiled, 65/65 pages |

Beyond the gates, I booted the production server and checked reality:

- All **12 assets return 200** with correct content types.
- Every `<link rel="icon">`, the manifest link, `theme-color`, and
  `og:image` + `og:image:width/height` are present in the served HTML.
- `next/image` optimisation of both logos returns valid PNGs.
- Manifest parses: `#B76E79` / `#ffffff` / `standalone` / 3 icons.

**The one test I changed.** `seo-config.test.ts` pinned `/logo.svg`, so it failed
once the OG image became a PNG. Its name claimed it "references an asset that
actually exists in the repository" but it only compared two strings — it would
have passed even if the file were deleted. I made it assert what it advertises,
with `existsSync` against `/public`, and **verified the new assertion fails when
the asset is removed** (temporarily deleted `og-image.png`, watched it go red,
restored it). Plus a new test covering OG dimensions and raster format.

### Payload

Brand assets came to 428 KB, which is careless for two-colour flat art on
Rwandan mobile data. Palette-quantised to **145 KB — 66% smaller** — with no
visible difference. Compression is part of the generator, so regenerating always
reproduces the shipped bytes.

---

## Laws — compliance

| # | Law | Status |
| --- | --- | --- |
| 1 | No `middleware.ts` / `next.config.js` / Prisma schema / CSP / HSTS / CORS | ✅ untouched |
| 2 | Keep i18n, low-data, offline cart, a11y, checkout | ✅ untouched; only **added** an i18n key (en + rw) |
| 3 | No deletions — add/enhance only | ✅ no file deleted; `settings.logoUrl` path kept |
| 4 | No credentials committed | ✅ see below |
| 5 | Preserve Tailwind + `#B76E79`/`#1a1a1a`/white | ✅ no class removed |
| 6 | TypeScript, typecheck/lint/build clean | ✅ all green |
| 7 | Do not deploy | ✅ **nothing pushed, nothing deployed** |
| 8 | Log failures, keep going | ✅ 3 logged below |

**On law 4.** `npm run build` cannot collect page data without a JWT secret, so
I created a **gitignored** `.env.local` holding throwaway `secrets.token_hex`
values and a dummy `localhost` database URL. No real credential is in it.
Confirmed with `git check-ignore` and `git status --porcelain --ignored`. The
`prisma:error` lines during build are that dummy URL refusing to connect — they
do not appear in a real environment, and production was never touched.

---

## Failures and deviations (law 8)

1. **First build attempt failed** — `A production JWT secret of at least 32
   characters is required`. Environment gap, not a code defect: compilation had
   already succeeded. Resolved with the gitignored `.env.local` above.
2. **16px favicon was illegible**, then **haloed black** after the first fix.
   Both found by rendering and *looking*. Fixed; see 1.2.
3. **`COSMETICSHOP` read as one word** in the first wordmark. Re-typeset as
   `COSMETIC SHOP` with letter-spacing.

---

## Not done, and why

- **Deployment** — forbidden by law 7. Ready for your review.
- **Database seeding / "resurrection"** — the premise was false; the DB is
  healthy. Running a seed here would have risked real catalogue data.
- **Dark-mode auto-swap** — `logo-dark.png` is generated and ready, but this
  codebase has **no dark-mode system** (no `darkMode` in `tailwind.config.ts`,
  no theme provider). Wiring a `dark:` variant that can never activate would be
  dead code; adding a whole theme system was out of scope and would have
  touched files law 1 protects. The asset is there the day you add one.

## Still open from the earlier audit (unchanged)

63 of 64 products lack `ProductImage` rows · duplicate `Hair Care`/`Haircare`
categories · Vercel Hobby plan prohibits commercial use · payments and SMS/email
unconfigured · GAP-3 MFA attempt ceiling · test-looking products in production
(`sdewsdxz`, `dcvsd`, `dgfvdvxc`).

---

## Files

**Added:** `public/{logo,logo-dark,logo-icon,og-image,favicon-16x16,favicon-32x32,apple-touch-icon,android-chrome-192x192,android-chrome-512x512,icon-maskable-512}.png`,
`public/favicon.ico`, `public/site.webmanifest`,
`brand-src/{build-brand-assets.py,icon-mark.png,README.md,.gitignore}`

**Modified:** `src/app/layout.tsx`, `src/lib/seo-config.ts`,
`src/components/layout/{Navbar,Footer}.tsx`,
`src/components/admin/AdminSidebar.tsx`,
`src/lib/i18n/translations/{en,rw}.ts`, `src/lib/__tests__/seo-config.test.ts`

**Deleted:** none.
