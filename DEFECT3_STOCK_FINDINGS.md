# Defect 3 — stock decrement: read-only findings

Requested before implementing. No code written. Answers your four questions.

---

## Q1. Does the existing CONFIRMED transition decrement stock?

**No.** `src/app/api/orders/[id]/route.ts` contains zero references to `stock`,
`decrement`, or `increment`. The status transition handler has never touched
inventory for any order type.

## Q2. Is existing logic path-specific or universal?

**Path-specific, and there are three separate implementations — none in the
transition handler.** Stock comes off at *creation* or at *webhook*, never at
admin confirmation:

| Creation path | Status at create | Stock taken | Where |
|---|---|---|---|
| `/api/orders/create` **COD** | `CONFIRMED` | at creation | `create/route.ts:111`, inside `if (paymentMethod === 'COD')` |
| `/api/orders/create` **online** | `PENDING` | at PayPack/Flutterwave webhook | `payment-events.ts:145` |
| `/api/orders` **wholesale/CREDIT** | `PENDING` | at creation, unconditionally | `orders/route.ts:315` |
| `/api/orders/whatsapp` | `PENDING_WHATSAPP` | **never** | — the gap |

Retail no longer uses `/api/orders` — it returns **410** unless
`isWholesale || paymentMethod === 'CREDIT'`.

## Q3. Extend existing logic rather than add parallel logic?

**There is nothing to extend.** The three sites are in three different files,
run at two different lifecycle moments, and none of them live in the
transition handler. Adding a decrement to `PATCH → CONFIRMED` would be a
**fourth** implementation, not an extension of a third.

## Q4. If no existing logic — the risk, and my proposal

### Your instruction would double-decrement two existing paths

You asked for the decrement on any transition **into CONFIRMED**. Applied
literally to the shared route, this breaks orders that already paid stock:

- **Wholesale/CREDIT** — created `PENDING` with stock **already decremented at
  creation** (`orders/route.ts:315`, unconditional). An admin moving it
  `PENDING → CONFIRMED` is a normal, expected action. Stock would come off
  **twice**.
- **Online retail** — created `PENDING`; the webhook sets `CONFIRMED`
  *directly in its own transaction* (`payment-events.ts:149`) and never calls
  PATCH. So the webhook path is safe *by accident*. But if an admin ever
  moved an online order `PENDING → CONFIRMED` manually, that decrements a
  second time. Today a guard blocks that (`'Online orders can be confirmed
  only after verified payment.'`) — the safety depends on a guard written for
  an unrelated reason, which is fragile.
- **COD retail** — born `CONFIRMED`, so it never transitions *into* CONFIRMED.
  Unaffected.

Net: of the four paths, **one needs the decrement** and **one would be
actively corrupted** by it.

### What I propose instead

Gate the decrement on the *source* status, not the target:

```
if (oldStatus === 'PENDING_WHATSAPP' && newStatus === 'CONFIRMED') → decrement
```

This is precise: `PENDING_WHATSAPP` is reachable only from
`/api/orders/whatsapp`, which provably never decrements. No other path can
enter this branch, so no existing behaviour changes and double-decrement is
structurally impossible rather than merely unlikely.

Everything else in your spec I would keep as written:
- one `prisma.$transaction` wrapping the status update **and** the decrements
- conditional `updateMany({ where: { stock: { gte: qty } } })` + `count !== 1`
  check, the same optimistic-lock idiom already used at the other three sites
- refuse with **409** listing every short product
- low-stock signal after decrement — `Product.lowStockThreshold` (default 5)
  and a `StockAlert` model already exist, and `payment-events.ts` already
  writes `securityAlert` rows on stock trouble, so I would follow that
  precedent rather than invent a mechanism

### One more thing you have not asked about, and should decide

**Cancelling never restores stock.** There is no `stock: { increment }`
anywhere except manual admin batch restocking
(`admin/products/[id]/batches`). So today, if a COD or wholesale order is
cancelled, the units stay deducted forever and the catalogue silently
understates what you can sell.

If I add a decrement at `PENDING_WHATSAPP → CONFIRMED`, then
`CONFIRMED → CANCELLED` will inherit exactly the same leak. I am not going to
add a restore-on-cancel to the shared route unprompted — it changes behaviour
for **every** existing order type, which your rules forbid. But you should
know the leak exists and is pre-existing, and decide separately whether to
fix it repo-wide.

---

## Recommendation

Approve the source-gated variant
(`PENDING_WHATSAPP → CONFIRMED` only) rather than the target-gated one
(`* → CONFIRMED`). Same outcome for WhatsApp orders, zero risk to the three
paths that already handle their own inventory.

Awaiting your go-ahead before writing any Defect 3 code.
