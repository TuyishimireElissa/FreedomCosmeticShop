# Five search improvements — complete

Deployed and verified live on `https://freedomcosmeticshop.com`, 2026-08-15.

| # | Feature | Outcome |
|---|---|---|
| 1 | Makeup + ingredient vocabulary | ✅ shipped `b794504` |
| 2 | Category quick jumps | ✅ shipped `58c72f8` |
| 3 | Suggestions with thumbnails | 🟢 **already existed** — not rebuilt |
| 4 | Related searches | ✅ shipped `e72e360` |
| 5 | Per-user search history | ✅ shipped `0286010` + 2 fixes |

---

## What the audit changed about the brief

**Phase 3 was already built.** `/api/search/suggestions` already returned
`image`, `imageUrl`, `imageAlt`, `categoryName`, and the component already
rendered a thumbnail, name, brand · category and price with arrow-key
navigation. Rebuilding it would have risked 39 passing tests for no visible
gain, so it was skipped.

**The brief wired vocabulary to the wrong list.** It said add makeup terms to
`CONTROLLED_SEARCH_VOCABULARY`. That list only drives popular-search analytics;
recall comes from `LOCAL_SEARCH_VOCABULARY`. Adding to CONTROLLED alone would
have made "lipstick" countable and still found nothing. Both were updated —
52 → 79 and 196 → 216.

**Two file paths were wrong** (`components/products/` → `components/storefront/`)
and **recents use `sessionStorage`, not localStorage** — they were already wiped
on tab close, which is what made Phase 5 worth building rather than a nicety.

---

## Measured results

| search | before | after |
|---|---|---|
| `coconut` | 0 | **9** |
| `glycerin` | 0 | **11** |
| `shea` | 0 | **5** |
| `argan` | 0 | **4** |
| `lipstick`, `ikaramu`, `kohl` | 0 | 0 → **WhatsApp sourcing panel** |

Makeup terms find nothing because the shop stocks no makeup. They are demand
capture, not recall — the empty result renders the sourcing panel, and the
demand becomes visible in `/api/search/popular`.

---

## Phase 5, and being wrong about it

I argued to defer this. The owner pushed back and was right — two of my three
reasons did not survive checking:

- *"Schema change is risky"* — this repo already has **10 hand-written
  migrations**, three of them this week. The procedure is proven.
- *"It reverses the privacy model"* — overstated. `Wishlist`, `Order` and
  `ActivityLog` already key on `userId`. `SearchLog` hashes because it is
  **anonymous**; this is the authenticated case, a different thing.

The reason that held: 6 customer accounts, none of whom have ordered. That is a
value judgement, and it was the owner's to make — not mine to make silently by
labelling it risky.

### Privacy, verified against the live database

- every handler authenticates via `requireAuth()` (httpOnly cookie), never a
  client-supplied id
- ownership enforced **inside** the delete predicate, not by
  findUnique-then-compare
- a miss returns **404, not 403**, so the endpoint never confirms an id belongs
  to someone else
- `private, no-store` on success **and** on the 401
- signed-out shoppers never reach the server

Proven end-to-end: three saves of one query produced **1 row**; user A could not
see user B's row; A deleting B's row by correct id deleted **0**.

---

## Three mistakes of mine, all caught before or during release

**1. A privacy mutation survived my first test pass.** Stripping `userId` from
the GET query left the suite green — `where: { userId: user.id }` appears twice
and the DELETE copy satisfied the assertion. My first fix was also wrong
(asserted occurrences == call count, but `upsert` legitimately uses it twice).
Now each Prisma call is sliced and checked individually.

**2. I committed before the build finished.** `0286010` exported constants from
a route file — Next rejects that, `tsc --noEmit` does not. Fixed in `54ab172`
with a test that parses both route files and rejects any non-handler export.

**3. The 401 was cacheable.** Not a data leak, but a cached "Unauthorized" would
keep being served to a device after the shopper signed in, so their history
would silently never appear. Fixed in `0714781`.

---

## Live verification

```
history API      GET/DELETE/DELETE-:id -> 401, private no-store   ✅
related searches 3 terms pass the gate -> section shows           ✅
quick jumps      isabune -> soap 33, baby-kids 1, body-care 1     ✅
vocabulary       coconut 9, glycerin 11, shea 5, argan 4          ✅
regression       13/13 routes, /search 308, admin 401             ✅
untouched        typo 19 hits, suggestions 200, RFQ 200           ✅
```

**1,918 tests / 160 files** (from 1,846) · **shared JS 103 kB — unchanged** ·
**0 packages added** · build 70/70.

---

## Still open

- **Makeup, nail care, shampoo, hair growth, natural & organic** have no stock.
  Vocabulary now routes those searches to WhatsApp; only new stock fills them.
- **Related searches currently shows my own verification traffic.** Three terms
  clear the 3-search gate and they are mine, not customers'. Treat the section
  as proof the pipeline works, not as demand data, until real traffic
  accumulates.
- **Search history serves 6 accounts.** It will matter more as accounts grow.
