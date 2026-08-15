# Search gaps — Phases 1–4 complete

All three genuine gaps built, deployed and verified live.
Last verified 2026-08-15 against `https://freedom-cosmetic-shop.vercel.app`.

---

## What was actually missing

The Phase 0 audit found **five of the seven requested features already shipped
and live**. Only three were real gaps. Those three are now done; the five
existing features were not modified.

| # | Feature | Before | Now |
|---|---|---|---|
| 1 | Smart search | ✅ already live | untouched |
| 2 | Faceted sidebar | ✅ already live | untouched |
| 3 | Voice search | ✅ already live | untouched |
| 4 | Visual search | ❌ | **still blocked** — needs your Cloudinary plan |
| 5 | **WhatsApp RFQ on 0 results** | ❌ | ✅ **built** |
| 6 | **`/search` route** | ❌ | ✅ **built** |
| 7 | **Popular searches** | ⚠️ returned `[]` | ✅ **real counts** |

---

## Commits

| commit | what |
|---|---|
| `c716019` | Phase 1 — WhatsApp RFQ panel |
| `18a4813` | a11y fix — WhatsApp pill unreadable when pressed |
| `d25117b` | Phase 2 — `/search` redirect |
| `9b8a92e` | Phase 3 — popular searches, controlled vocabulary |
| `eb7d79e` | **fix — `/search` served 200 HTML, not a 308** |

---

## Phase 1 — a failed search becomes a sourcing request

**73 of 231 logged searches returned nothing.** Each showed *"No products match
your filters — try removing a filter"* to a shopper who had applied no filter.

Now they get a warm panel and a WhatsApp button that pre-fills:

> Hello FreedomCosmeticShop! I searched for "[query]" on your website but found
> nothing. Do you stock this product? I would like to order.

**Source-gated.** It appears only when a *search* found nothing and no filter is
active. An empty result caused by a filter keeps the old, correct message.

### I did not use the button variant you specified

You asked for the existing `fcs-whatsapp` variant. Measured:

| | ratio | |
|---|---|---|
| white on `fcs-whatsapp` #25D366 | **1.98:1** | fails AA badly |
| white on `fcs-whatsapp-pill` #1E874A | 4.55:1 | passes |

Using the named variant would have shipped near-invisible text on the one
button the feature exists to get tapped.

---

## The a11y bug this uncovered

While building it, my own test caught that pairing the pill with
`hover:bg-fcs-whatsapp-hover` (#128C7E) is **4.14:1** — the label failed AA *at
the moment of being pressed*. Rest state passed every check; nobody measures a
hover.

**Four components had it**, not just mine: `Hero.tsx`, `CategoryComingSoon.tsx`
(my own Phase 5 work), `CartDrawer.tsx`, `TrackOrderView.tsx`. All now use the
new `--fcs-whatsapp-pill-hover` #17703D (**6.14:1**).

The regression test sweeps every `.tsx` under `src/` rather than naming files,
so a component added later cannot reintroduce the pairing.

---

## Phase 2 — `/search` redirect, and the bug that nearly shipped

`/search?q=soap` → **308** → `/products?search=soap`. Filters preserved.

**Both query params are accepted**, because the audit found both in genuine
use: `?q=` in DidYouMean and the suggestions API, `?search=` in HomeSearch,
BottomNav and the products page. The brief specified only `?q=`; shipping that
alone would have silently dropped the term for anyone arriving with the param
the storefront itself uses.

### ⚠️ My first implementation passed 13 tests and did not work

I built it as `page.tsx` calling `permanentRedirect()`, and tested it by mocking
`next/navigation`. **In production it returned 200 with an HTML body, not a
redirect.**

Because the component renders nothing, Next had already begun streaming, so it
embedded `NEXT_REDIRECT;…;308` in the payload for the *client* to act on. That
works for an in-app click and fails for a shared WhatsApp link, a crawler, or
`curl`.

Caught only by hitting the deployed URL in Phase 4. Fixed with a route handler
returning a real `NextResponse.redirect(target, 308)`. The tests now assert on
`response.status` and the `Location` header.

**The lesson:** mocking the framework function under test only proves it was
called. For anything whose contract is an HTTP response, assert on the response.

---

## Phase 3 — popular searches without storing what people type

`recordSearch` keeps only an HMAC of each query, because search text can contain
a name or a phone number. That made "what do people search for?" unanswerable.

**Your 40-term controlled vocabulary solves it.** When a query contains a word
from your own catalogue list, that *word* is recorded — an exact value from a
fixed list, never customer text.

Verified live by firing real searches:

```json
[ {"term":"amavuta","searches":1,"zeroResultSearches":0},
  {"term":"isabune","searches":1,"zeroResultSearches":0},
  {"term":"soap","searches":1,"zeroResultSearches":0},
  {"term":"sunscreen","searches":1,"zeroResultSearches":0},
  {"term":"vitamin c","searches":1,"zeroResultSearches":0} ]
```

Matching is longest-first and word-boundaried:
`coconut oil` → `coconut oil` (not the broader `oil`) · `soapstone` → nothing ·
`Mukamana 0788123456` → **nothing**.

**No schema change** — the term rides in the existing `filters Json?` column.
The 254 pre-existing log rows carry no term and are simply not counted; their
queries are hashed and cannot be backfilled.

**Zero-result counts are reported per term**, because a popular search that
finds nothing names a product you could stock.

### A pre-existing security test failed, and I diagnosed it before changing anything

`search-api-security.test.ts` asserted the endpoint contains `data: []` — i.e.
that it reports nothing. That described a *missing feature*, not a security
property, and would have blocked the safe implementation. Rewritten to assert
what actually matters: no hash is imported, selected or returned; only the
controlled term column is read; nothing outside the vocabulary can be emitted.
Proven by mutation.

---

## Phase 4 — verification

| Your check | Result |
|---|---|
| Search `xyznotexist` → WhatsApp RFQ | ✅ 0 results, page 200, all RFQ strings in bundle |
| `/search?q=soap` → `/products?search=soap` | ✅ **308** with correct `Location` |
| `/api/search/popular` → term counts | ✅ 5 terms with real counts |
| All 1,766 existing tests still pass | ✅ **1,831 passing / 156 files** |

Plus: 16/16 routes OK · admin APIs 401 · the five untouched search features all
still working (typo `vitamn` → 19, `uruhu` → 71, facets, suggestions 200).

**Shared JS 103 kB — unchanged. 0 packages added.**

---

## Still open

**Visual search (feature 4) is blocked on you.** It needs (a) confirmation your
Cloudinary plan includes an auto-tagging add-on and its cost, and (b) tag data
that does not exist — `ingredients` is filled on 4 of 107 products, so it would
return nothing today.

**Vocabulary gaps worth noting:** `lipstick`, `mascara` and `foundation` are not
in your 40-term list, so searches for them are not counted. They also return
zero products. If you plan to stock makeup, add them to
`CONTROLLED_SEARCH_VOCABULARY` so the demand becomes visible.

**Note:** facets now report **111 products across 10 categories** (was 107/9),
so you have been adding stock since the category work.

---

## Follow-up: our own category names returned zero

Found while verifying the deodorants added on 2026-08-15.

Typing the Kinyarwanda label printed on the menu tile found nothing:

| typed | before | now |
|---|---|---|
| `kwera` (Kwera no Kurangaza) | **0** | **24** |
| `deodorante` (Deodorante) | **0** | **6** |
| `ifarasi` (Ifarasi) | 0 | 0 — expansion works, no nail stock yet |

### And `abana` returned men's products

`abana` (children) had no vocabulary entry, so it fell through to fuzzy
matching, where it scores **0.8533** against `abagabo` (men) — just over the
0.85 threshold. A parent searching for baby products was shown men's deodorant
and men's soap.

Now returns Zwitsal Baby Lotion, Johnson's Baby Cream, Boudchou Baby Ointment.

**Two fixes:** the missing entries were added, and fuzzy matching is now skipped
when the query is already an exact vocabulary key. Adding the entry alone was
not enough — the typo pass ran anyway and still bolted `abagabo` on. Typo
tolerance is unchanged for unknown words: `vitamn` 19, `vitanin` 28,
`skincaer` 73.

### A weak assertion of my own, caught by mutation

Deleting the `kwera` entry left the suite green, because the sibling key
`kwera no kurangaza` matched by substring and satisfied the check — the
sibling-satisfies trap in rule 20. Added a `hasOwnProperty` assertion per term;
removing any of the four now fails.

Shipped `bdf1a45`. 1,835 tests passing.

---

## Live search analytics — first real data

`/api/search/popular` is now accumulating, with no raw query text stored:

| term | searches | found nothing |
|---|---|---|
| abana | 4 | 0 |
| deodorante | 3 | 2 |
| amavuta | 2 | 0 |
| isabune | 2 | 0 |
| kwera | 2 | 1 |
| uruhu | 2 | 0 |

**Caveat, stated plainly:** most of these are my own verification searches, and
the "found nothing" counts for `deodorante`, `kwera` and `ifarasi` were recorded
*before* the vocabulary fix deployed. They are not customer demand. Real signal
will build from now on — treat the table as proof the pipeline works, not as a
stocking decision.

The one row worth watching is **`ifarasi`**: nail care has no stock at all, so
any future search there is genuine unmet demand.
