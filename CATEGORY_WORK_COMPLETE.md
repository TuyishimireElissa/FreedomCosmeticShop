# Category system — final handover

All phases complete, deployed and verified on production.
Last verified 2026-08-15 against `https://freedom-cosmetic-shop.vercel.app`
(the live URL at the time; the site moved to `https://freedomcosmeticshop.com`
on 2026-08-15 and the old URL now 307-redirects there).

---

## Where the shop stands

| | before | now |
|---|---|---|
| Categories | 7 (5 hard-coded in the navbar) | **16, all from the database** |
| Stocked categories | 5 | **9** |
| Empty ("Vuba") | 11 | **7** |
| Products correctly filed | 107 in 5 buckets | **107 across 9** |
| Owner can edit categories | no, needed a developer | **yes, admin panel** |
| Empty category shows | "No products match your filters" | **Biraza vuba / Coming soon** |

### Product distribution

| Category (RW) | slug | products |
|---|---|---|
| Imibavu | fragrance | 34 |
| Isabune | soap | 33 |
| Kwera no Kurangaza | whitening | 9 |
| Kwita ku musatsi | haircare | 7 |
| Abana | baby-kids | 7 |
| Vaseline | petroleum-jelly | 7 |
| Amavuta y’Umubiri | body-oil | 4 |
| Kwita ku ruhu | skincare | 3 |
| Kwita ku mubiri | body-care | 3 |
| Ibikoresho byo kwisiga · Ibikoresho by'abagabo · Gukura Umusatsi · Kamere · Ifarasi · Deodorante · Shampoo | — | **0 (Vuba)** |

---

## Commits, in order

| commit | what |
|---|---|
| `74595fd` | 107 products re-categorised — 61 moves + 4 data repairs |
| `f5c1fd2` | quiz regression **I caused**, fixed |
| `869dbca` | renaming a category no longer breaks shared links |
| `77da80d` | Phase 4 — admin category screen |
| `5e161b7` | Phase 4 handover + audit rules 14–17 |
| `a4b675d` | Phase 5 — Coming Soon panel |
| `874d782` | Phase 5 handover + audit rules 18–20 |
| `de7a3cb` | body-oil apostrophe + doc status corrections |

---

## Final verification

**Data integrity** — every figure matches the pre-migration snapshot exactly:

```
product rows 128 · live 107 · orders 11 · orderItems 163 · cartItems 70
sum stock 10,388 · sum price 662,300 · products with no category 0
duplicate category slugs 0 · sortOrder 1–16 with no gaps or duplicates
nameRw set on all 16 · ghost hair-care still inactive+deleted at 99
```

**Live** — 23/23 routes HTTP 200 (all 16 category pages, home, products, quiz,
cart, wholesale, admin, product detail). All 4 admin APIs return 401 without a
login. Search recall healthy: vitamin 26, uruhu 71, amavuta 54, isabune 35,
xyzfake 0.

**Build** — 67/67 pages. **Shared JS 103 kB, unchanged across the entire
engagement.** 0 packages added.

**Tests** — **1,766 passing / 152 files**, up from 1,711 / 149. Every new
assertion mutation-tested.

---

## Mistakes I made, and how each was caught

Recorded because the pattern matters more than the individual bugs.

| # | mistake | how it was caught |
|---|---|---|
| 1 | Called a live **Dettol 4-pack** a "junk test row" | opened the Cloudinary image |
| 2 | Called three **Veet sizes** "duplicates" | read the SKUs (`…-500ML/300ML/200ML`) |
| 3 | Re-categorisation silently **broke 6 of 9 quiz skin paths** | measured counts against the pre-migration snapshot |
| 4 | Approved 67-move plan would have **reverted an approved fix** | re-ran the classifier after the data changed |
| 5 | Used `text-fcs-charcoal`, **a token that does not exist** | grepped every class against `tailwind.config.ts` |
| 6 | Four **decorative test assertions** that could not fail | mutation testing |
| 7 | `body-oil` shipped a **straight apostrophe** where i18n uses curly | compared the database against the i18n file |

Number 3 is the one worth remembering: the quiz returned **HTTP 200 with valid
JSON** the whole time. Nothing alerted. A crash would have been easier to find.

Numbers 1, 2 and 7 share a shape — I trusted a *report* instead of checking the
*source*. Rules 14–20 in `AUDIT_STANDARDS.md` exist so the next engineer does
not repeat them.

---

## What only you can do

**Stock the seven empty categories.** No amount of re-sorting fills them — I
searched every product name and description:

- **makeup** — zero matches for lipstick, mascara, foundation, eyeshadow, eyeliner, concealer
- **nail-care** — zero for nail, manicure, pedicure, cuticle
- **deodorant** — zero for deodorant, roll-on, antiperspirant
- **shampoo** — zero (one castor oil mentions "before shampooing", that is all)
- **hair-growth**, **natural-organic** — several soaps say herbal/organic, but they are soaps first
- **mens-grooming** — empty after your decision that all perfume is Fragrance; needs aftershave, beard or razor stock

**Decide on RETURNED orders.** Cancelled orders now restore stock correctly.
Returned ones deliberately do not, because auto-restoring possibly opened or
damaged goods could be worse than the leak. **0 returned orders exist today**,
so nothing is wrong right now — but the question is still open. See
`STOCK_CANCELLATION_LEAK.md`.

**Fix two remaining data-quality items** (I did not touch these, they are
yours to judge):
- **ingredients filled on 4 of 107 products; brand on 2 of 107.** Brand-based
  filtering and ingredient search cannot work usefully until these are filled.

*(The duplicate Dabur listing that was here has been fixed — see `de7a3cb`
onward. Both sizes now carry the size in the name, matching the Veet
precedent. No duplicate product names remain among the 107 live products.)*

---

## Two judgement calls worth revisiting later

**1. The phone menu leads with your two smallest categories.**
`stockedFirst()` puts stocked categories first, then sorts by `sortOrder`. Since
Skin Care and Body Care are `sortOrder` 1 and 2 but now hold 3 products each,
the menu opens with them while Isabune (33) and Imibavu (34) sit at rows 3–4.
Nothing is broken, and you can fix it yourself in **Admin → Categories** by
changing the Order numbers. I did not reorder it because merchandising order is
your call, not mine.

**2. The homepage tiles follow stock depth.** They now show Fragrance, Soap,
Whitening and Haircare, because `CategoryGrid` picks the four largest. You
approved this. If you would rather pin specific categories there, say so — it is
a small change.

---

## Files

**Live code:** `src/components/admin/AdminCategories.tsx` ·
`src/app/admin/categories/page.tsx` · `src/components/products/CategoryComingSoon.tsx` ·
`src/lib/category-i18n-map.ts` · `src/hooks/use-categories.ts` ·
`src/components/layout/CategorySoonBadge.tsx`

**Rollback:** `PRODUCT_CATEGORY_SNAPSHOT_20260814T222207Z.{json,sql}` restores
every product's category to the state just before the 61 moves, keeping the
approved text repairs. 128 rows, replay-verified, 0 mismatches. The `205552Z`
pair restores the original pre-everything state.

**Record:** `CATEGORIZATION_LOG.md` (audit trail) · `PHASE4_COMPLETE.md` ·
`PHASE5_COMPLETE.md` · `AUDIT_STANDARDS.md` (20 rules) · `MANUAL_REVIEW.md` ·
`prisma/manual-migrations/` (4 hand-written SQL files, all idempotent)
