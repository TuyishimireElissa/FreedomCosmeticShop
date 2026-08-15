# Phase 5 — Coming Soon page for empty categories

**Status: BUILT AND SHIPPED — `a4b675d`.** This file is the requirement as
filed; read `PHASE5_COMPLETE.md` for what shipped. Resolutions to the three
open questions recorded at the bottom of this file were:

1. **Wording** — `"Biraza vuba"`, not `"Bizaza vuba"` or
   `"Turaritegura — biraza vuba!"`. It matches the Vuba badge already on the
   menu, and sold-out reuses `"Byashize"` from `common.sold_out`.
2. **Where** — inline in `ProductGrid`, as recommended. No redirect, no second
   URL.
3. **Sold out vs never stocked** — implemented. `/api/categories` now also
   returns `totalProducts` (ignores stock) alongside `_count` (stock > 0), so
   the two cases get different messages.

The count below is also out of date: after the 2026-08-15 re-categorisation
**7 of 16** categories are empty, not 11.
**Filed:** 2026-08-14, after Phases 1–3 deployed at `eb6643a`.

---

## Why it is needed

Phase 2 removed the rule that hid empty categories, and Phase 3 created ten
more. **11 of 16 live categories now have zero products.**

Tapping any of them today reaches `/products?category=soap`, which renders the
existing filter empty state:

> **No products match your filters**
> *Try removing a filter or using a broader search.*

That is coherent and does not crash — verified live, HTTP 200 on soap, makeup,
baby-kids and shampoo. But it is wrong in tone: the shopper did not apply a
bad filter, the shop simply has no stock yet.

**Owner accepted this as temporary** on the grounds that empty categories will
not be marketed, tapping them is unlikely in Kigali right now, and the **Vuba**
badge sets the expectation before the tap.

---

## Requirements (owner-specified)

| # | Requirement |
| --- | --- |
| 1 | Hero message — **"Bizaza vuba"** (rw) / **"Coming Soon"** (en) |
| 2 | WhatsApp CTA — **"Duhamagare tuvuge iki cyiciro"** / **"Message us about this category"**, to `wa.me/250790215965` with the category name pre-filled |
| 3 | Link back to browse all products |
| 4 | Bilingual, `// verified-rw` on every new Kinyarwanda string |
| 5 | Sign-up-for-notification — **deferred**, requires SMS or email |

### Why notification sign-up is deferred

`/api/config/features` reports `sms: false, email: false`. A `StockAlert`
backend exists but has **no customer-facing entry point and no delivery
channel**. Collecting a request nobody can answer is worse than not offering
it — the same reasoning that removed the "Notify me" button from the product
card in Phase 4 of the search work.

Revisit when Pindo SMS clears RURA approval.

---

## Open questions for the owner

**1. Kinyarwanda wording is inconsistent between two briefs.**

An earlier brief specified `"Turaritegura — biraza vuba!"`; this one specifies
`"Bizaza vuba"`. Both are plausible. **Confirm which before building** — I will
not pick one silently.

**2. Where does it render?**

Two options, and the choice matters:

- **Inline in `ProductGrid`** — swap the empty state when the active filter is
  a category with zero products. Smallest change, keeps one URL, no routing
  work. But `ProductGrid` is shared with search, so the condition must be
  precise: *category filter set, no search term, no other filters, count = 0*.
- **A dedicated route** (`/products/category/[slug]/coming-soon`) — cleaner
  separation, but adds a redirect, a second URL for the same category, and a
  canonical-tag decision.

Recommendation: **inline**. It avoids a redirect on a 3G connection and keeps
shareable category URLs working.

**3. Does it apply to a category that is out of stock temporarily?**

`_count.products` counts `stock > 0`. A category whose products all sold out
would show Coming Soon, which reads oddly for stock that existed yesterday.
Distinguishing "never had stock" from "sold out" needs a separate count —
worth deciding, not worth guessing.

---

## Constraints that already apply

- `fcs-*` tokens only, no raw hex, never `#C77B85`
- Mobile-first, 360px minimum
- Respect `prefers-reduced-motion` — the `fcs-whatsapp` button variant has a
  breathing animation that must be disabled
- No web fonts
- WhatsApp number `+250 790 215 965`, verified in `business-config.ts`
- Category display name must come through `categoryLabel()` from
  `src/lib/category-i18n-map.ts` so it resolves `nameRw` → i18n key → English

---

## What Phase 5 must not do

- Do not claim a launch date. There is no date.
- Do not promise notification until a delivery channel exists.
- Do not hide the category — owner decision is that visibility is controlled
  by `isActive` in admin, not by stock.
