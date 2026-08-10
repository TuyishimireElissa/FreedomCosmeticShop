# Warm Brutalism redesign — Phase 0 audit

Read-only. No code written. Baseline **893 tests / 119 files**, HEAD `c77c6bd`.

---

## 1. File inventory

**`components/home/` — 12 files, 1,224 lines**

| File | Lines | Verdict |
|---|---|---|
| `Hero.tsx` | 133 | **extend** — banner fetch, low-data path, WhatsApp CTA all work |
| `HeroBanner.tsx` | 206 | **check first** — carousel; spec wants single image |
| `DeliveryPromo.tsx` | 210 | extend |
| `ReviewsSection.tsx` | 138 | extend — empty state shipped this session |
| `FeaturedProducts.tsx` | 114 | **extend** — bento is a layout change only |
| `TrustSection.tsx` | 104 | **rebuild** — 0 `fcs-` tokens, 5 raw hex |
| `MainCategories.tsx` | 73 | **rebuild** — 9 raw hex, spec wants 2×2 image cards |
| `HomeSearch.tsx` | 71 | keep |
| `HowToOrder.tsx` | 69 | **extend** — shipped this session; spec wants icons-only vertical |
| `PersonalizedRecommendations.tsx` | 62 | keep |
| `WhatsAppCTA.tsx` | 26 | keep — already fully tokenised |
| `QuizBanner.tsx` | 18 | dormant (not rendered) |

**`components/products/` — 11 files.** `ProductsPageClient` 238, `ProductCard` 216 (in `storefront/`), `ProductImageGallery` 145, `ProductDetailClient` 160, plus `FilterChips`, `FilterSidebar`, `MobileFilters`, `ProductGrid`, `ProductTabs`, `QuickView`, `DeliveryEstimator`, `OrderViaWhatsApp`.

**`components/cart/` — 2 files only**: `CartWhatsAppOrder.tsx`, `WholesaleCartOrderButton.tsx`. The cart *page* is `/cart` and checkout lives in `components/checkout/` (7 files).

## 2. Extend vs rebuild

**Extend (majority).** Every "new" capability in the spec already has a working implementation:

| Spec item | Already exists |
|---|---|
| `<FloatingWhatsApp />` sticky button | **`ui/WhatsAppButton.tsx`**, mounted globally in `SiteChrome`, with **6 tests** covering hidden-on-admin/checkout, mobile vs desktop links, tooltip, 44px target, translations |
| `<SkeletonCard />` / `<SkeletonGrid />` | `ui/skeleton.tsx` + inline skeletons in `FeaturedProducts`, `page.tsx`, admin |
| Sticky header + bag badge | `Navbar.tsx:102` already `sticky top-0 z-50 … backdrop-blur-md`; `cartCount()` badge at line 75 |
| Swipeable gallery | `ProductImageGallery.tsx`, scroll-snap already used in 3 files |
| Infinite scroll | IntersectionObserver already used in 1 file (`LazySection`) |

**Genuine rebuilds:** `TrustSection` (0 tokens), `MainCategories` (9 raw hex), bento layout for featured, 2×2 category grid.

## 3. Token audit — **3 of 6 new colours fail WCAG AA**

Computed, not assumed (relative luminance, sRGB):

| Token | Hex | vs #FFF | As text | White text on fill |
|---|---|---:|---|---|
| `--fcs-surface-elevated` | `#FFFFFF` | 1.00:1 | n/a — surface | n/a |
| `--fcs-surface-muted` | `#F0E6D8` | 1.23:1 | n/a — surface | n/a |
| `--fcs-border-subtle` | `#E5D9C8` | 1.39:1 | n/a — border | n/a |
| `--fcs-urgent` | `#C0392B` | **5.44:1** | ✅ PASS | ✅ PASS |
| `--fcs-success` | `#27AE60` | **2.87:1** | ❌ FAIL | ❌ FAIL |
| `--fcs-info` | `#2980B9` | **4.30:1** | ❌ fails body | large-only |
| Phase 4 pill `#1F8A4C` | | **4.38:1** | ❌ fails body | large-only |

**AA-compliant replacements at the same hue:**

```
--fcs-success  #27AE60 -> #1E864A   4.60:1
--fcs-info     #2980B9 -> #287CB3   4.54:1
WhatsApp pill  #1F8A4C -> #1E874A   4.55:1
```

⚠️ **`--fcs-success` already exists** at `globals.css:35` as `#2D8A4E` (4.32:1). Redefining it to `#27AE60` would **lower** contrast on every current use. Recommend keeping `#2D8A4E` or upgrading it to `#1E864A`, not replacing it with the spec value.

Also already present and reusable: `--fcs-warning #E8A838`, `--fcs-error #D64045`, `--fcs-shadow-1..4`, `--fcs-radius-sm/md/lg/xl`, `--fcs-ease-silk`, `--fcs-ease-bounce`.

**Genuinely new and needed:** `--fcs-surface-elevated`, `--fcs-surface-muted`, `--fcs-border-subtle`, `--fcs-urgent`, `--fcs-info`, `--fcs-transition-snap`.

**Radius conflict:** spec says cards 12px / modals 20px. Existing `--fcs-radius-md` is 12px ✅ and `--fcs-radius-lg` is 20px ✅. No new radius tokens needed.

## 4. Cart → Bag rename

State is safe to leave alone: `useStore.ts` exposes `items`, `addToCart`, `removeFromCart`, `cartCount`, `isCartOpen`, `goCart`. **59 distinct `t('cart.*')` keys**, 6 files referencing the `/cart` route. UI-only rename is feasible — translations plus visible labels.

🚨 **"Bag (Igare)" is wrong Kinyarwanda — this is the third time this error has appeared.**

```
igitebo (basket/cart) : 56 occurrences in rw.ts
igare   (bicycle)     :  0 occurrences
```

`igare` means **bicycle**. I flagged it in the homepage brief and again in the FAQ brief; the spec now proposes making it the *feature name* across the whole UI. The correct word is **`igitebo`**, already used consistently in 56 places. Renaming the UI to "Igare" would read to a Rwandan customer as "Bicycle (3)".

Note also: English "Bag" and Kinyarwanda `igitebo` diverge — `igitebo` is *basket*. That is fine and idiomatic; forcing a literal "bag" translation would be worse.

## 5. WhatsApp CTA format — confirmed

`getWhatsAppLink()` in `business-config.ts:219` produces exactly the spec format, verified live:

```
https://wa.me/250790215965?text=Muraho%20FreedomCosmeticShop!%20Nkeneye%20ubufasha.
```

It also guards against publishing an owner placeholder. **All new CTAs must call this helper**, never hard-code `wa.me` — a test added this session (`homepage-conversion`) already enforces that for the hero.

---

## 6. Blocking conflicts to resolve before Phase 1

**(a) `/bag` and `/orders/[id]` do not exist.** Existing equivalents: `/cart`, `/track-order`, `/account/orders`. Creating `/bag` means either a redirect from `/cart` (SEO + 6 internal links to update) or a rename. `/orders/[id]` overlaps `/track-order`, which already has a customer-facing tracking flow with signed access tokens. Which do you want — new routes, or restyle the existing ones?

**(b) Phase 4 conflicts with shipped work.** The WhatsApp order flow was built and verified this session: `/api/orders/whatsapp` saves the order *before* `wa.me` opens, with server-side price recomputation and an `FC-YYYYMMDD-XXXX` reference. The spec's "Pre-fills wa.me message with products, total, saved address" describes a *client-only* flow that would bypass that. I will not regress it — the bag CTA should call the existing endpoint.

**(c) Scope.** Phases 1–4 as written touch ~40 files across the whole storefront. Given every phase here has been deployed to live production immediately, I'd recommend Phase 1 (tokens + shell) ship alone first — it is the foundation and the least reversible if wrong.

---

## Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | `#27AE60` / `#2980B9` / `#1F8A4C` fail AA | use `#1E864A` / `#287CB3` / `#1E874A` |
| 2 | `--fcs-success` collision (`#2D8A4E` exists) | keep existing or upgrade to `#1E864A`; do not downgrade |
| 3 | "Igare" for Bag | use **`igitebo`** — `igare` = bicycle |
| 4 | `/bag` + `/orders/[id]` new routes? | restyle `/cart` and `/track-order`; avoid SEO churn |
| 5 | Bag CTA behaviour | call the existing `/api/orders/whatsapp`, do not client-build the message |
| 6 | Rebuild `FloatingWhatsApp` / skeletons? | extend the existing ones — 6 tests already cover the button |
