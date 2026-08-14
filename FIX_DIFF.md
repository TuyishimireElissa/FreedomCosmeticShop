# Exact database changes — Fix 1 + Fix 2

**Status: NOT EXECUTED.** Live DB is still `skincare 23 / body-care 44 / fragrance 33 / haircare 6 / mens-grooming 1`.
Scope: **4 product rows**. Only the fields listed below. Nothing else is touched.

---

## FIX 1 — Dettol soap (Option B: fix text, keep live)

`id = cmrxot6sb0002emxghg18nhay`

| field | OLD | NEW |
|---|---|---|
| `name` | `soap` | `Dettol Fresh Antibacterial Soap (Pack of 4)` |
| `shortDescription` | `soap` | `Antibacterial soap pack of 4 bars. Protects against 99.9% of germs.` |
| `description` | `ggy` | `Dettol Fresh Antibacterial Soap kills 99.9% of bacteria and germs. This pack contains 4 bars of fresh-scented antibacterial soap, ideal for the whole family. Gentle enough for daily use.` |
| `usageInstructions` | `4ff` | `Wet hands, lather soap, scrub for 20 seconds, rinse thoroughly.` |
| `costPrice` | `100000` | `1500` |
| `size` | `"30 ml "` | `4 bars` |
| `volume` | `"50 ml"` | `NULL` |
| `sku` | `r4r4` | `DETTOL-FRESH-4PACK` |
| `categoryId` | `cmrolygcr0004mfrc4ed6uqvz` (skincare) | `cat_545de7c3ea70b1fdb590a` (soap / Isabune) |

**Unchanged:** `slug` (`soap`), `price` 2300, `compareAt` 2500, `wholesalePrice` 1900, `wholesaleActive` true, `stock` 96, `realSku` `wre3e4rder434`, `images`, `brandId` (Freedom Glow), `isActive` **true**, `isDeleted` false, `featured`, `isNew`, `rating`, `reviewsCount`, `minWholesaleQty`, `lowStockThreshold`.

**Not touched, as instructed:** the cart holding 12 units, the wishlist entry, order `FCS-2026-MSG6YKUZ`.

---

## FIX 2 — Veet Gold ×3 (Option A: keep all live, rename, move to body-oil)

### 2a. 500 ml — `id = cmsgc7y6m0001rqg2omrg09c4`

| field | OLD | NEW |
|---|---|---|
| `name` | `Veet Gold Turmeric Super Whitening Oil` | `Veet Gold Turmeric Super Whitening Oil 500ml` |
| `description` | `...lightweight body oil intended for daily skincare. According to the product packaging...` (350 chars) | `Veet Gold Turmeric Super Whitening Oil is a powerful brightening body oil enriched with turmeric extract. Reduces dark spots, evens skin tone, and leaves skin glowing. Available in 500ml.` |
| `categoryId` | `cmrwfqcn40007fp33o5hwbb4i` (body-care) | `cat_ae64caabb30fdaa2635bc` (body-oil) |

### 2b. 300 ml — `id = cmsgd1vne0001xr62k2p30osg`

| field | OLD | NEW |
|---|---|---|
| `name` | `Veet Gold Turmeric Super Whitening Oil` | `Veet Gold Turmeric Super Whitening Oil 300ml` |
| `description` | same shared text as above | `...Available in 300ml.` |
| `categoryId` | `cmrolygcr0004mfrc4ed6uqvz` (skincare) | `cat_ae64caabb30fdaa2635bc` (body-oil) |

### 2c. 200 ml — `id = cmsgd7e0u0001rkiavi8qq4p0`

| field | OLD | NEW |
|---|---|---|
| `name` | `Veet Gold Turmeric Super Whitening Oil` | `Veet Gold Turmeric Super Whitening Oil 200ml` |
| `description` | same shared text as above | `...Available in 200ml.` |
| `categoryId` | `cmrolygcr0004mfrc4ed6uqvz` (skincare) | `cat_ae64caabb30fdaa2635bc` (body-oil) |

**Unchanged on all three:** `slug`, `price` (10000/8000/7000), `compareAt`, `wholesalePrice`, `stock` (50 each), `sku` (`VG-TUR-OIL-500ML` / `-300ML` / `-200ML`), `size`, `volume`, `shortDescription`, `images`, `isActive` **true**, `isDeleted` false.

**Not touched:** the 9 order lines across 5 orders, the cart holding 1× 200 ml.

---

## Totals

| | |
|---|---|
| rows updated | **4** |
| text fields changed | 11 |
| `categoryId` changed | 4 |
| products deleted | **0** |
| products deactivated | **0** |
| prices changed | **0** |
| stock changed | **0** |
| carts / wishlists / orders touched | **0** |

## Pre-flight checks (all passed)

- `sku` `DETTOL-FRESH-4PACK` is unique — no collision (`sku` is `@unique`).
- Category `soap` = `cat_545de7c3ea70b1fdb590a` "Isabune", active, not deleted.
- Category `body-oil` = `cat_ae64caabb30fdaa2635bc` "Amavuta y'Umubiri", active, not deleted.
- No name collision with your two existing Dettol products (`DET-SO-001`, `FCS-13847A`).
- No medical-claims validator exists that would reject "99.9%".
- All 4 slugs unchanged → **no URL breaks, no redirects needed**.
- Runs in **one transaction**; any error rolls back all 4.

## ⚠️ One consequence you should know

Fix 2 **overrides my categorisation plan** for these three products.

| product | my plan said | your instruction |
|---|---|---|
| Veet 500 ml | whitening | **body-oil** |
| Veet 300 ml | whitening | **body-oil** |
| Veet 200 ml | whitening | **body-oil** |

Your call wins — they *are* body oils, and the name says "Oil". I will **remove these three from the 67-move list** so Step 5 does not move them again into whitening.

Revised: **67 moves → 64 moves.** Whitening ends at **9** products, not 12. Body-oil ends at **4** (the Vaseline body oil + these three).

Dettol → soap matches the plan, so it is simply applied early; soap still ends at 33.
