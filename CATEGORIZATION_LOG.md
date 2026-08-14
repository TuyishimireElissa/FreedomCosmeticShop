# Categorization Log — audit trail

Data migration executed 2026-08-14. Production database, Supabase `aws-1-eu-central-1`.
**Only `Product.categoryId` and four products' text fields were written. No product deleted, deactivated, repriced, or restocked.**

---

## Step 3 — data quality fixes (4 rows, one transaction)

### Fix 1 — Dettol soap repaired (owner Option B: fix text, keep selling)

`cmrxot6sb0002emxghg18nhay`

| field | old | new |
|---|---|---|
| name | `soap` | `Dettol Fresh Antibacterial Soap (Pack of 4)` |
| shortDescription | `soap` | `Antibacterial soap pack of 4 bars. Protects against 99.9% of germs.` |
| description | `ggy` | full product copy |
| usageInstructions | `4ff` | `Wet hands, lather soap, scrub for 20 seconds, rinse thoroughly.` |
| costPrice | `100000` | `1500` |
| size | `"30 ml "` | `4 bars` |
| volume | `"50 ml"` | `NULL` |
| sku | `r4r4` | `DETTOL-FRESH-4PACK` |
| categoryId | skincare | soap |

Unchanged: slug `soap`, price 2300, stock 96, isActive true, images, brand.
The `costPrice` of 100,000 RWF against a 2,300 RWF sale price was a real data bug — every sale looked like a 97,700 RWF loss.

### Fix 2 — Veet Gold ×3 renamed, moved to body-oil (owner Option A)

| id | new name | category |
|---|---|---|
| `cmsgc7y6m0001rqg2omrg09c4` | Veet Gold Turmeric Super Whitening Oil **500ml** | body-care → body-oil |
| `cmsgd1vne0001xr62k2p30osg` | Veet Gold Turmeric Super Whitening Oil **300ml** | skincare → body-oil |
| `cmsgd7e0u0001rkiavi8qq4p0` | Veet Gold Turmeric Super Whitening Oil **200ml** | skincare → body-oil |

Descriptions replaced with owner-supplied copy naming the size. Prices, stock, SKUs, active status untouched.

---

## Step 5 — category moves (61 rows, one transaction)

Committed in 9,351 ms. Pre-flight confirmed all 61 rows still matched the plan before writing.

| target | moved in |
|---|---|
| soap | 32 |
| whitening | 9 |
| baby-kids | 7 |
| petroleum-jelly | 7 |
| skincare | 2 |
| body-care | 2 |
| haircare | 1 |
| fragrance | 1 |
| body-oil | 1 |

### Verification performed

- **Per-product:** all 61 landed in the intended category; price, stock and active status compared before/after on every row — zero drift.
- **Aggregates:** total rows 128→128 · live 107→107 · sum of stock 10,388→10,388 · sum of price 662,300→662,300 · orderItems 163→163 · cartItems 70→70.
- **Live production:** `/api/categories` returns 16 categories summing to 107; every category endpoint HTTP 200; 10 pages HTTP 200.

---

## Final distribution

| sortOrder | Category (RW) | slug | before | after |
|---|---|---|---|---|
| 1 | Kwita ku ruhu | skincare | 23 | **3** |
| 2 | Kwita ku mubiri | body-care | 44 | **3** |
| 3 | Isabune | soap | 0 | **33** |
| 4 | Imibavu | fragrance | 33 | **34** |
| 5 | Kwera no Kurangaza | whitening | 0 | **9** |
| 6 | Kwita ku musatsi | haircare | 6 | **7** |
| 7 | Ibikoresho byo kwisiga | makeup | 0 | **0** (Vuba) |
| 8 | Ibikoresho by'abagabo | mens-grooming | 1 | **0** (Vuba) |
| 9 | Abana | baby-kids | 0 | **7** |
| 10 | Amavuta y'Umubiri | body-oil | 0 | **4** |
| 11 | Vaseline | petroleum-jelly | 0 | **7** |
| 12 | Gukura Umusatsi | hair-growth | 0 | **0** (Vuba) |
| 13 | Kamere | natural-organic | 0 | **0** (Vuba) |
| 14 | Ifarasi | nail-care | 0 | **0** (Vuba) |
| 15 | Deodorante | deodorant | 0 | **0** (Vuba) |
| 16 | Shampoo | shampoo | 0 | **0** (Vuba) |

**Stocked 5 → 9. Vuba badges 11 → 7.** Total 107 throughout.

---

## Owner decisions that overrode the rule engine

1. **Q3 — all perfume is Fragrance.** Men's Grooming keyword list reduced to grooming tools (`beard, shaving, shave, aftershave, razor, trimmer`). `for men`, `men's`, `male` removed. Result: the three men's body mists stayed in Fragrance.
2. **Fix 2 — the three Veet oils are pinned to body-oil by product id.** Without the pin the engine re-classified them to whitening on the word "Whitening" in their names, silently undoing the owner's Step 3 decision. Caught by re-running the classifier after Step 3.

## Side effects, measured not assumed

- **Homepage tiles** (`CategoryGrid`, largest-first) now: Fragrance 34, Soap 33, Whitening 9, Haircare 7. Previously Body Care 44, Fragrance 33, Skincare 23, Haircare 6. Owner approved (Q2).
- **Men's Grooming is now empty** and shows a Vuba badge. Its only product, *Vaseline Blue Seal Men Cooling Perfumed Petroleum Jelly*, is a petroleum jelly and moved to Vaseline.
- **Quiz skin path** now draws from 3 products (was 23). Verified live: returns HTTP 200 with 1 recommendation, no crash. Hair path returns 3. Widening the quiz's skin path to include whitening/soap/petroleum-jelly is a **code** change and was deliberately not bundled into this data migration.
- **`/api/categories` is cached 60s** — production showed stale counts for the first minute after the write, then corrected itself. Confirmed by re-polling.

## Rollback

`PRODUCT_CATEGORY_SNAPSHOT_20260814T222207Z.json` / `.sql` — taken **after** Step 3 and **before** Step 5, so restoring it undoes the 61 moves while keeping the approved text fixes. 128 rows, replay-verified with 0 mismatches.

`PRODUCT_CATEGORY_SNAPSHOT_20260814T205552Z.*` is the original pre-everything state.
