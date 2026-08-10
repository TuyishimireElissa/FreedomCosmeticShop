# Phase 5 (homepage) — Phase 0 audit

Read-only. No code changed. Baseline: **859 tests / 117 files**, HEAD `2ed9ca2`.

**Headline: the homepage already exists.** 11 components, 1,098 lines, 10 rendered
sections. This phase is **revision, not construction** — and roughly half of
your six requested sections are already live and working.

---

## Your three direct questions

### Q1. Does the hero have a clear "Order via WhatsApp" CTA?

**No.** `Hero.tsx` has two CTAs:

| CTA | Target |
|---|---|
| Primary — "Shop Now" | `/products` |
| Secondary — **"Wholesale Deals"** | `/wholesale` |

For a WhatsApp-first shop this is a real gap, and the secondary slot is worse
than empty: it sends a first-time retail buyer to a **wholesale application
page**. WhatsApp does appear on the homepage, but far below the fold in
`WhatsAppCTA` (section 9 of 10). Nothing above the fold says you can order by
WhatsApp.

**Recommendation:** replace the wholesale secondary CTA with "Order on
WhatsApp". Wholesale keeps its nav entry and its page; it just stops being the
second thing a retail customer is offered.

### Q2. Does the trust section mention 30 districts and MoMo/Airtel/Cash?

**Neither, and one line is now actively wrong.**

Current four cards (plus three conditional):

| Card | Copy today | Problem |
|---|---|---|
| Delivery | "1,000 RWF · Same day when available…" | Kigali only. No nationwide claim. |
| Returns | "30-day returns" | fine |
| Payment | "MTN MoMo · Airtel Money · **Visa · Mastercard**" | **Card payments do not work.** `payments.enabled: false`. Cash is not mentioned. |
| Authentic | "Product sourcing… shown on product listings" | vague but honest |

The payment card advertises Visa/Mastercard, which the shop cannot accept. That
is a live promise you cannot keep — the most important thing this audit found.

On **"30 districts"**: I checked the database. `DeliveryZoneSettings` holds
**5 zones** (Kigali same-day, Northern, Southern, Eastern, Western) — provinces,
not districts. Rwanda does have 30 districts and the five provinces do cover all
of them, so "we deliver to all 30 districts" is *defensible*, but nothing in the
system enumerates 30 districts and no fee is defined per district. I would write
**"Delivery to every province in Rwanda"**, which is exactly what the data
supports, or keep your 30-districts wording only if you confirm you will
genuinely ship to any district on request.

**Good news:** two trust cards were **hidden until yesterday** and Priority 1
switched them on — location ("Nyarugenge, Nyarugenge, Kigali") and support hours.
Note the location card interpolates `sector, district` separately, so it still
shows the duplicate that I fixed in `address.short`. Small copy fix needed.

### Q3. Is the footer rendering real contact info?

**Yes — verified live in production.** All three rows now render:

```
tel:+250790215965        +250 790 215 965
mailto:freedomcosmetic…  freedomcosmeticshop@gmail.com
MapPin                   Nyarugenge, Kigali, Rwanda
```

Confirmed on the live site: 0 placeholder markers on `/`, `/contact`, `/about`,
`/shipping`, `/terms`; contact page renders phone ×1, email ×2, Nyarugenge ×2,
both support-hour ranges. The footer needed no change — its guards simply
started passing.

---

## Your "Featured Products" correction — you were right, and it is worse than you thought

You said bestsellers are meaningless at 6 orders. Correct. But the existing
`featured` flag is **also** meaningless:

```
active products : 101
featured = true :  99   ← 98% of the catalogue
isNew    = true :   0
```

`Product.featured` exists and is indexed, and `/api/products/featured` already
queries it — but with 99 of 101 flagged, ordering falls through to
`updatedAt desc`. **"Featured" today means "whatever I edited most recently."**
Live proof — the homepage right now shows:

```
SUPER LOVE' RED Eau de Parfum 2PCS Gift Set   6,500
Cantu Shea Butter Coconut Curling Cream      11,000
MIADI Hair Curl Activator Gel                 4,500
MIADI Hair Mouldin' Gel Wax                   4,500
```

That is not curation, it is edit history.

**No new flag is needed.** The mechanism you asked for already exists end to end
— schema, index, API, component. What is missing is *data discipline*: 99
products must be un-flagged so the 4–6 you choose actually mean something. That
is a data change, not a code change, and I will not run it without your explicit
say-so because it touches 99 catalogue rows.

Two ways to do it:
- **(a)** I clear `featured` on all 101, you tick 4–6 in the admin product
  editor. Reversible, and I will take a backup of the current flags first.
- **(b)** You give me the 4–6 product names now and I set exactly those.

Also worth knowing: `isNew = 0` across the catalogue, so the second
`FeaturedProducts type="new-arrivals"` block falls back to `sort=newest` and
shows the most recently created products. That one is honest, so I would leave it.

---

## Section-by-section against your spec

| Your spec | Exists? | Assessment |
|---|---|---|
| 1. Hero + browse CTA + **WhatsApp CTA** | partial | Hero is good; WhatsApp CTA missing, wholesale CTA misplaced |
| 2. Trust bar (districts, MoMo/Airtel/Cash, authentic) | partial | exists; **payment copy is wrong**, delivery claim too narrow |
| 3. Featured products 4–6 | **yes** | works; data is the problem, not the code |
| 4. **How to order (3 steps)** | **NO** | genuinely missing — the only true net-new section |
| 5. Testimonials empty state | partial | `ReviewsSection` self-hides below 3 reviews (0 today) — renders **nothing** |
| 6. Footer with real contact | **yes** | done, verified live |

**Already on the page and not in your spec:** `HomeSearch`, `MainCategories`
(6 categories), `PersonalizedRecommendations`, `DeliveryPromo`, `QuizBanner`.

⚠️ **`QuizBanner` should probably be removed or hidden.** The beauty quiz is
broken — it filters on `ingredients` (1/101) and `skinType` (22/101), so it
returns zero products for most inputs. The homepage currently invites customers
into a dead end. Your call; I would hide it until you have filled product content.

---

## Design-system state — this is the real work

Sections were built before the `fcs-*` system landed and never fully migrated:

| Component | `fcs-` uses | Raw hex still present |
|---|---|---|
| TrustSection | **0** | `#1a1a1a #8a4a55 #B76E79 #EEEEEE #FAFAFA` |
| MainCategories | 2 | **9 different hex values** |
| Hero | 1 | `#1a1a1a #8B4A55 #9B5A64 #B76E79` |
| QuizBanner | 2 | `#1a1a1a #985661` |
| FeaturedProducts | 4 | `#9B5A64 #f8f9fa` |
| WhatsAppCTA | 5 | **none** ✅ |

`TrustSection` uses **zero** tokens and hard-codes `#8a4a55`, which is not in
the palette at all. Migrating these is mechanical but touches shipped, working
UI, so I would do it as its own commit with contrast maths shown per colour —
not bundled with copy changes.

---

## What I recommend, in order

1. **Hero WhatsApp CTA** — replace the wholesale secondary. Highest conversion
   impact, smallest change.
2. **Fix the payment trust card** — remove Visa/Mastercard, add Cash. This is a
   correctness fix, not a design one.
3. **How to order (3 steps)** — the one genuinely new section.
4. **Testimonials empty state** — "Be our first review" with a WhatsApp link, as
   you specified. Currently renders nothing at all.
5. **Hide QuizBanner** until product content exists.
6. **Token migration** — separate commit, contrast verified.
7. **Featured curation** — data decision, needs your input (a or b above).

Items 1–5 are the conversion work. Item 6 is hygiene. Item 7 is yours.

---

## Decisions I need before writing code

| # | Question | My recommendation |
|---|---|---|
| 1 | Replace wholesale hero CTA with WhatsApp? | yes |
| 2 | Delivery claim wording | "every province in Rwanda" unless you confirm 30-district shipping |
| 3 | Featured curation | (a) clear all + you pick in admin, with a backup |
| 4 | Hide the broken QuizBanner? | yes, until content exists |
| 5 | Token migration in this commit or separate? | separate |
