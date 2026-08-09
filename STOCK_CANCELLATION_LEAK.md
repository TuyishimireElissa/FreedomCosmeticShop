# Stock is never restored when an order is cancelled

Filed as deferred work by owner decision. **Not fixed in this session.**

---

## The bug

Every path that takes stock does so permanently. Nothing anywhere in the
codebase adds it back when an order is cancelled or returned.

Verified by exhaustive search — the only `stock: { increment }` in `src/` is
manual admin restocking:

```
src/app/api/admin/products/[id]/batches/route.ts:74   stock: { increment: data.quantity }
```

That is a supplier-delivery form an admin fills in by hand, not an automatic
release. Cancelling an order runs this and nothing else:

```ts
// /api/orders/[id] PATCH, status === 'CANCELLED'
db.payment.updateMany({ ... status: 'FAILED' })
db.delivery.updateMany({ ... status: 'FAILED' })
// no product.update — the units stay deducted forever
```

## Affected paths

| Path | Stock taken at | Restored on cancel |
|---|---|---|
| `/api/orders/create` COD | creation | **no** |
| `/api/orders/create` online | PayPack/Flutterwave webhook | **no** |
| `/api/orders` wholesale/CREDIT | creation | **no** |
| `/api/orders/whatsapp` | `PENDING_WHATSAPP → CONFIRMED` (added in this session) | **no** |

The WhatsApp path now inherits the identical behaviour — deliberately.

## Why it was not fixed now

Owner decision, and I agree with it:

> Creating asymmetric behavior (WhatsApp restores, others don't) would be
> worse than the current uniform leak. Better to have one consistent bug than
> two inconsistent behaviors.

A restore-on-cancel in the shared route would change behaviour for **every**
existing order type in one commit — exactly the class of change the project
rules forbid without isolated approval. One predictable bug beats four paths
behaving differently.

## Impact

**Symptom:** the catalogue understates what is actually sellable. Stock drifts
downward over time, products appear out of stock while sitting on the shelf,
and the low-stock alert fires on phantom shortages.

**Magnitude today: zero.** Live database, checked this session:

```
6 orders total — CONFIRMED 3, PENDING 2, CANCELLED 1
```

The single cancelled order is `FCS-2026-MRYPZ7M5` (33,100 RWF, Kamonyi), whose
payment is `MTN_MOMO: FAILED`. Online orders only decrement at a **successful**
payment webhook, so that order never took stock and there is nothing to
restore. **No units are currently lost.** The leak is latent, not active.

It becomes real the first time a COD, wholesale, or WhatsApp order is cancelled
after its stock was taken.

## Proposed fix, when addressed

Do it once, for all four paths, in a single reviewed change:

1. Add a `stockReleasedAt DateTime?` column to `Order`. Without a marker, a
   double-cancel or a retry restores twice — the mirror image of the
   double-decrement problem that shaped the Defect 3 design.
2. On `→ CANCELLED` **and** `→ RETURNED`, inside one `$transaction`:
   - skip entirely if `stockReleasedAt` is already set (idempotency)
   - skip if the order never took stock — an online order whose payment never
     reached `PAID`, or a WhatsApp order still in `PENDING_WHATSAPP`
   - otherwise `increment` each line, honouring merged duplicate lines exactly
     as the decrement does
   - stamp `stockReleasedAt`
3. Lock product rows in sorted id order, matching the decrement, so a
   concurrent confirm and cancel cannot deadlock.
4. Decide the `RETURNED` policy explicitly — returned goods may be damaged and
   not resellable. This is a business question, not a code one. Restoring
   automatically may be wrong.

**Determining "did this order take stock?" is the hard part**, because the four
creation paths take it at three different moments. A `stockTakenAt` column set
by whichever path performs the decrement would make both directions
self-describing and is worth doing as part of the same change.

## Recommendation

Address as a separate initiative covering all order types together, with its
own tests and its own deploy. Do not bolt it onto a WhatsApp feature.

Prerequisite: it should come **after** the WhatsApp dashboard ships, because
the dashboard is what will finally make cancellations frequent enough for this
to matter.
