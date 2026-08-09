# Phase 4 pre-flight — three defects in my own Phase 2/3 work

Found by reading the code before building the dashboard, then proving each one.
All three are in `ad37a33`, which I shipped. None were caught by the 741 tests
because no test exercises a `PENDING_WHATSAPP` order through the admin flow.

Baseline re-verified this session: **741 passing / 113 files**, HEAD `ad37a33`,
live DB **6 orders, 0 with `whatsappSentAt`**.

---

## Defect 1 — `PENDING_WHATSAPP` is a dead-end state (blocker)

`src/app/api/orders/[id]/route.ts` guards every status change against a
transition table that I never added the new status to:

```
const ALLOWED_STATUS_TRANSITIONS = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  ...
}                       // ← no PENDING_WHATSAPP key
```

`ALLOWED_STATUS_TRANSITIONS['PENDING_WHATSAPP']` is `undefined`, so the guard
falls back to `[]` and **every** transition is refused:

```
PENDING_WHATSAPP -> CONFIRMED  : HTTP 409 BLOCKED
PENDING_WHATSAPP -> PROCESSING : HTTP 409 BLOCKED
PENDING_WHATSAPP -> SHIPPED    : HTTP 409 BLOCKED
PENDING_WHATSAPP -> DELIVERED  : HTTP 409 BLOCKED
PENDING_WHATSAPP -> CANCELLED  : HTTP 409 BLOCKED
```

`PENDING_WHATSAPP` is also absent from `VALID_STATUSES`, so the Zod schema
rejects it as a *target* too.

**Effect:** every order the new checkout creates is permanently frozen. The
owner cannot confirm, ship, or even cancel it. Phase 4's status buttons would
have returned 409 on every click.

## Defect 2 — WhatsApp orders have no `Payment` row, so "mark paid" cannot work

`/api/orders/whatsapp` creates the order with `items` only. No `Payment`
record. Three consequences, all proven against the real code paths:

```
GET /api/orders/[id] → paymentMethod = firstPayment?.method || 'COD'
  0 Payment rows  →  API reports "COD"        ← wrong, it is PENDING
PATCH markPaid guard: payments[0]?.method !== 'COD'  → true  → HTTP 409
PATCH write guard:    payments.length > 0            → false → silent no-op
```

So the existing admin reports these as cash-on-delivery, refuses to mark them
paid, and if that guard were relaxed it would silently write nothing.

`Order.paymentMethod` (the new column, correctly `'PENDING'`) is never read by
any admin surface — all of them read `payments[0].method`.

## Defect 3 — stock is checked but never reserved or decremented

`/api/orders/whatsapp` reads `product.stock` and rejects oversell at creation,
then never decrements. `/api/orders/create` decrements inside its transaction:

```
tx.product.updateMany({ where: { id, stock: { gte: qty } },
                        data: { stock: { decrement: qty } } })
```

I do **not** think decrementing at creation is right here — the order is saved
*before* the customer sends the message, so speculative orders would drain
inventory and anyone could zero the catalogue by opening checkout repeatedly.
But stock has to come off at *some* point, and right now it never does. This
is a business decision, not a bug I should quietly pick an answer to.

---

## Observation, not a defect — revenue now includes unsent orders

`/api/admin/analytics` sums `status: { not: 'CANCELLED' }`, so
`PENDING_WHATSAPP` counts toward today/week/month/year revenue the moment
checkout is opened — before the customer has sent anything. This was already
true of `PENDING`, so it is pre-existing behaviour, but WhatsApp orders are
created far more speculatively, which makes the distortion much larger.
Flagging rather than changing: revenue reporting is not in Phase 4's scope.

## Minor, pre-existing — duplicate React keys in the admin sidebar

`AdminSidebar.tsx` renders `key={item.tab}`, but `tab` is not unique:

```
Commerce  duplicate: products   (Products, Reviews)
Growth    duplicate: analytics  (Analytics, Live Visitors, WA Analytics, WhatsApp Guide)
```

React silently keeps the first of each duplicate pair. I will use a unique key
for the nav entry I add rather than extend the broken pattern.
