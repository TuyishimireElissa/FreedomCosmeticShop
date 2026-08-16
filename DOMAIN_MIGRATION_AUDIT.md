# Phase 0 — custom domain migration audit (read only)

Performed 2026-08-15 against `HEAD = 0ae4780`, the live site, and the new
domain. No code written, nothing changed.

---

## ⚠️ HEADLINE — THE SEO DAMAGE IS ALREADY LIVE

`freedomcosmeticshop.com` is serving, but **every SEO signal on it still points
at the old Vercel URL**. Measured just now:

```
GET https://freedomcosmeticshop.com/robots.txt
    Host:    https://freedom-cosmetic-shop.vercel.app     ← wrong
    Sitemap: https://freedom-cosmetic-shop.vercel.app/sitemap.xml  ← wrong

GET https://freedomcosmeticshop.com/sitemap.xml
    <loc>https://freedom-cosmetic-shop.vercel.app</loc>   ← every URL wrong

GET https://freedomcosmeticshop.com
    <link rel="canonical" href="https://freedom-cosmetic-shop.vercel.app">
    <meta property="og:url"   content="https://freedom-cosmetic-shop.vercel.app">
    <meta property="og:image" content="https://freedom-cosmetic-shop.vercel.app/og-image.png">
```

**What this is doing right now:**

1. **The canonical tag actively tells Google to de-index the new domain.** Every
   page on `freedomcosmeticshop.com` declares that the *real* version lives at
   the `.vercel.app` URL. Google will honour that and keep the old domain in
   the index.
2. **The old URL 307-redirects to the new one.** So the canonical points at a
   URL that immediately redirects back — a canonical/redirect loop. Google
   treats this as a broken signal and may pick a URL on its own.
3. **Social shares of the new domain preview the old one.** `og:url` and
   `og:image` both resolve to `.vercel.app`.
4. **The sitemap submits only old URLs**, so the new domain's pages are never
   directly announced.

This is the highest-severity item in the audit and it is live today.

---

## ✅ THE GOOD NEWS — ONE VARIABLE FIXES ALMOST ALL OF IT

The codebase is well-built for this. Every SEO surface derives from a single
value:

```
src/lib/seo-config.ts:21
  const siteUrl = withoutTrailingSlash(process.env.NEXT_PUBLIC_APP_URL || BUSINESS.url)
```

Everything downstream consumes `SEO_CONFIG.siteUrl`:

| Consumer | File | How |
|---|---|---|
| `metadataBase`, canonical, OG, Twitter | `src/app/layout.tsx:28` | `new URL(SEO_CONFIG.siteUrl)` |
| sitemap.xml — all 13 static + every product, category, blog, bundle | `src/app/sitemap.ts:8` | `const baseUrl = SEO_CONFIG.siteUrl` |
| robots.txt — `Host` and `Sitemap` | `src/app/robots.ts:30-31` | `${SEO_CONFIG.siteUrl}` |
| JSON-LD Organization, LocalBusiness, Product, Breadcrumb | `src/lib/structured-data.ts:19,39,71,74` | `${SEO_CONFIG.siteUrl}` |

**There are no hardcoded URLs in any SEO file.** No `metadata.ts`, `sitemap.ts`,
`robots.ts` or structured-data file contains a literal domain.

So the fix is: **set `NEXT_PUBLIC_APP_URL` in Vercel**, and change the fallback
in the two places the default is written.

---

## Full findings table

### A. SEO CRITICAL — must change

| # | File:line | Current | Proposed | Why |
|---|---|---|---|---|
| A1 | *Vercel env* | `NEXT_PUBLIC_APP_URL` **unset** | `https://freedomcosmeticshop.com` | **Root cause of every symptom above.** You said you will set this manually |
| A2 | `src/lib/business-config.ts:161` | `url: 'https://freedom-cosmetic-shop.vercel.app'` | `https://freedomcosmeticshop.com` | The fallback when the env var is missing. Feeds `SEO_CONFIG.siteUrl` |
| A3 | `src/lib/business-config.ts:160` | `domain: 'freedom-cosmetic-shop.vercel.app'` | `freedomcosmeticshop.com` | Display/domain string |
| A4 | `src/lib/business-config.ts:162` | `adminUrl: '…vercel.app/admin'` | `https://freedomcosmeticshop.com/admin` | Used in admin links |
| A5 | `src/lib/env.ts:12` | `APP_URL: …default("https://freedom-cosmetic-shop.vercel.app")` | new domain | Zod schema default |
| A6 | `src/lib/env.ts:106` | `APP_URL: "https://freedom-cosmetic-shop.vercel.app"` | new domain | Production fallback object |

### B. FUNCTIONAL — customer- and staff-facing links

| # | File:line | Current | Impact |
|---|---|---|---|
| B1 | `src/server/services/email.ts:97` | `process.env.NEXT_PUBLIC_APP_URL \|\| 'https://…vercel.app'` | Every link in every email. Email is currently **disabled** (`communications.email: false`), so no live impact today |
| B2 | `src/app/api/admin/staff/route.ts:86` | same fallback, in the staff-invite SMS | Staff onboarding SMS. SMS is **disabled** today |

Both already read the env var first, so setting A1 fixes them at runtime. The
literal fallback should still be corrected.

### C. TESTS — fixtures, not production URLs

| # | File:line | Note |
|---|---|---|
| C1 | `src/lib/__tests__/contact-route.test.ts:4` | `const ORIGIN = '…vercel.app'` — a synthetic request origin |
| C2 | `src/lib/__tests__/whatsapp-service.test.ts:33,46,48` | product/store URL fixtures |
| C3 | `src/lib/__tests__/thumbnail-image-size.test.ts:90` | a `blob:` URL fixture |

**Recommendation: leave C1–C3 alone.** They are arbitrary test inputs, not
assertions about the live domain. Changing them adds churn and risk with no
benefit. I will flag this rather than silently rewrite tests.

### D. DOCUMENTATION — 5 files, 1 hit each

`CATEGORY_WORK_COMPLETE.md` · `LOGO_EMBED_AUDIT.md` · `MISSING_ENV.md` ·
`SEARCH_GAPS_COMPLETE.md` · `SEARCH_PHASE0_AUDIT.md`

All are historical records of verification runs against the old URL. Phase 3
covers these.

### E. CLEAN — no change needed

| Checked | Result |
|---|---|
| `vercel.json` | No URL. Build command, region `cdg1`, 2 crons only |
| `next.config.js` | No site URL. Only Cloudinary/Unsplash image hosts + CSP |
| `package.json` | No URLs in scripts |
| `src/app/sitemap.ts` | Uses `SEO_CONFIG.siteUrl` — **no hardcoding** |
| `src/app/robots.ts` | Uses `SEO_CONFIG.siteUrl` — **no hardcoding** |
| `src/app/layout.tsx` | Uses `SEO_CONFIG.siteUrl` — **no hardcoding** |
| `src/lib/structured-data.ts` | Uses `SEO_CONFIG.siteUrl` — **no hardcoding** |
| `.env.local` | `NEXT_PUBLIC_APP_URL` key **exists** (value not read) |

---

## 🛑 SOMETHING UNEXPECTED — I MUST STOP AND REPORT

Your brief says the new domain "also serves" `www`. It does — and that is a
problem the brief does not cover.

```
https://freedomcosmeticshop.com       -> 200
https://www.freedomcosmeticshop.com   -> 200      ← NOT a redirect
```

**Both hostnames serve the same content with a 200.** That is textbook
duplicate content. Once the canonical is fixed to the apex domain it is largely
mitigated — Google will consolidate — but the correct configuration is for
`www` to **301 to the apex** (or vice versa).

**This is a Vercel dashboard setting, not code.** In Vercel → Domains, one of
the two should be set as a redirect to the other. I cannot do this from the
repo and I will not guess which you want as primary.

**My recommendation:** keep `freedomcosmeticshop.com` (apex) as primary — it
matches your brief and is shorter for a WhatsApp-first audience — and set
`www` to redirect to it.

---

## Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Canonical points at old domain | **CRITICAL — live now** | Phase 1: set env + fallback |
| Sitemap lists only old URLs | **HIGH — live now** | Same fix |
| `www` and apex both 200 | **MEDIUM** | Vercel dashboard, your action |
| Old `.vercel.app` stops working | **LOW** | It 307s to the new domain; Vercel keeps it. Nothing in code depends on it |
| Email/SMS links wrong | **LOW** | Both channels disabled today |
| Breaking the build | **LOW** | Change is 6 string literals; 1,835 tests guard the rest |

**Rollback:** every change in Phase 1–2 is a string literal in 2 files. Revert
the commit, or simply set `NEXT_PUBLIC_APP_URL` back — the env var overrides the
literals either way.

---

## Recommended sequence

**Order matters here.** Set the env var **first**, because it takes effect on
the next deploy and immediately corrects canonical, sitemap, robots and OG —
before any code change lands.

| Phase | Action | Who |
|---|---|---|
| 1a | Set `NEXT_PUBLIC_APP_URL=https://freedomcosmeticshop.com` in Vercel | **You** |
| 1b | Update the 6 literals in `business-config.ts` + `env.ts` | Me |
| 2 | Verify SEO surfaces — no code expected to change, they are already dynamic | Me |
| 3 | Update the 5 docs | Me |
| 4 | Tests + live verification | Me |
| — | Set `www` → apex redirect in Vercel Domains | **You** |

---

## Questions before Phase 1

1. **Apex or www as primary?** I recommend apex (`freedomcosmeticshop.com`),
   matching your brief. Confirm, then set the other to redirect in Vercel.
2. **Have you set `NEXT_PUBLIC_APP_URL` yet?** Production still resolves to the
   old URL, so either it is unset or the deploy predates it. Phase 1 is safe
   either way — the literal fallback will be correct too — but I want to know
   which state we are in before I verify.
3. **Test fixtures (C1–C3): leave as-is?** My recommendation is yes. They are
   synthetic inputs, not domain assertions.

---

**PHASE 0 AUDIT COMPLETE — Awaiting approval.**

---

# PHASES 1–4 COMPLETE — live verified 2026-08-15

## ⚠️ My Phase 0 audit was wrong twice

**1. I reported `public/robots.txt` as clean. It wasn't.** My grep covered
`src/`, `prisma/` and the config files, never `public/`. That static file
carried two hardcoded old URLs. `sitemap-robots.test.ts` failed and caught it.

**2. I reported `NEXT_PUBLIC_APP_URL` as "unset". It was set — to the old URL.**
I inferred its state from a symptom (production served the old host) instead of
reading the project configuration. One Vercel API call would have shown the real
value.

That second error mattered: the Phase 1 code fix deployed green and **changed
nothing**, because a `NEXT_PUBLIC_*` env var is inlined at build time and wins
over the code fallback. The canonical tag kept pointing at the old host through
three deploys.

Corrected via the Vercel API, previous values recorded for rollback:

| variable | was | now |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://freedom-cosmetic-shop.vercel.app` | `https://freedomcosmeticshop.com` |
| `NEXTAUTH_URL` | `https://freedom-cosmetic-shop.vercel.app` | `https://freedomcosmeticshop.com` |

`NEXTAUTH_URL` was included on the owner's explicit instruction — a config
value, not auth logic. No auth code touched.

## Live verification

| Check | Result |
|---|---|
| `robots.txt` Host | `https://freedomcosmeticshop.com` ✅ |
| `robots.txt` Sitemap | `https://freedomcosmeticshop.com/sitemap.xml` ✅ |
| `sitemap.xml` | **150 URLs, 0 on the old host** ✅ |
| Homepage canonical | `https://freedomcosmeticshop.com` ✅ |
| Product page canonical | `…/products/soap` ✅ |
| Category page canonical | `…/products` ✅ |
| `og:url` / `og:image` | new domain ✅ |
| `twitter:image` | new domain ✅ |
| JSON-LD `@id` ×3 | organization / store / website ✅ |
| Old host in shipped HTML | **0 across 5 sampled pages** ✅ |
| Old `.vercel.app` URL | still 307s to the new domain — no broken links ✅ |
| Functional sweep | 13/13 routes, admin 401, search 71 hits, RFQ 200 ✅ |

## `www` — largely mitigated, one step still yours

`www.freedomcosmeticshop.com` still returns **200 rather than redirecting**, so
both hostnames serve identical content. **But it now emits a canonical pointing
at the apex**, so Google will consolidate and the duplicate-content risk is
mostly gone.

The clean fix is still a **301 from `www` to the apex**, set in Vercel →
Domains. That is a dashboard setting, not code.

## What to do in Google Search Console

1. Add `https://freedomcosmeticshop.com` as a new property.
2. Submit `https://freedomcosmeticshop.com/sitemap.xml`.
3. Use the **Change of Address** tool from the old property, if the
   `.vercel.app` domain was ever verified there.
4. The 307 on the old URL is fine for users. If you want the strongest SEO
   signal, Vercel can be set to 308/301 instead — a permanent redirect passes
   ranking more decisively than a temporary one.
