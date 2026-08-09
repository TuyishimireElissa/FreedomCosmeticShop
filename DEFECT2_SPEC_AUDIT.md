# Defect 2 — spec audit before implementation

Seven conflicts between the approved spec and the codebase. No code written.
Four need your decision; three I can resolve myself and have proposed answers for.

---

## BLOCKER 1 — `status: 'COMPLETED'` is not a value this system uses

Spec says create the Payment with `status: 'COMPLETED'`.

`Payment.status` in `schema.prisma` is documented `PENDING | PAID | FAILED |
REFUNDED`, and the only values written anywhere in `src/` are:

```
PENDING  34x     PAID  20x     FAILED  18x     REFUNDED  3x
COMPLETED  0x    ← never used as a payment status anywhere
```

Writing `'COMPLETED'` would create a value nothing reads. Concretely it breaks:

- `/api/admin/analytics` — the "Paid" conversion funnel counts
  `payments: { some: { status: 'PAID' } }`. A COMPLETED row is invisible.
- `/api/admin/export` — filters `where: { status: 'PAID' }`.
- `AdminView` order detail — colours green only on `paymentStatus === 'PAID'`.
- `/api/orders/[id]` GET — derives `paymentStatus` from `payments[0].status`.

**Proposal: use `'PAID'`.** It is the existing vocabulary and every surface
already understands it. `COMPLETED` would be a silent reporting hole.

## BLOCKER 2 — `MOMO` / `AIRTEL` / `CASH` are not the method vocabulary either

Spec body is `method: 'MOMO' | 'AIRTEL' | 'CASH'`.

`Payment.method` is documented `MTN_MOMO | AIRTEL_MONEY | CARD | COD`, and
`PAYMENT_METHODS` in `src/lib/format.ts` — which every admin screen renders
labels from — has exactly these keys:

```
MTN_MOMO   AIRTEL_MONEY   CARD   COD   BANK_TRANSFER
```

`/api/admin/analytics` does `payment.groupBy({ by: ['method'] })`. Introducing
`MOMO` alongside `MTN_MOMO` splits the same real-world method into two buckets
forever, and `PAYMENT_METHODS['MOMO']` is `undefined`, so the UI renders the
raw string instead of a label.

**Proposal: accept `MTN_MOMO | AIRTEL_MONEY | CASH` in the request and store
them unchanged.**

`CASH` is the one genuinely new value and I think it is correct to add: `COD`
means "cash on delivery" as a *checkout choice*, whereas here you are
recording cash that has physically arrived for a WhatsApp order. But it is new
vocabulary in a shared column, so — **your call**: `CASH` (new, precise) or
reuse `COD` (no new value, slightly wrong meaning). I lean `CASH`.

## BLOCKER 3 — `recordedBy`, `recordedAt`, `notes`, `reference` do not exist on Payment

All four spec fields are missing from the model:

```
recordedBy  MISSING     recordedAt  MISSING
notes       MISSING     reference   MISSING
```

Adding them is a **migration** — which is exactly the reason you scoped
`cancellationReason` out of Phase 4a.

Existing columns that already carry this meaning:

| Spec field | Existing column | Note |
|---|---|---|
| `recordedAt` | `completedAt DateTime?` | already set to `new Date()` when a payment is marked PAID elsewhere |
| `reference` | `providerReference String?` | free-text; `providerTransactionId` is `@unique` and better suited to idempotency |
| `notes` | *(none)* | `Order.adminNotes` exists — already migrated, currently unused |
| `recordedBy` | *(none)* | `logActivity` already records admin id, name, role, IP, and entity id |

**Proposal: zero migrations.** Map `reference → providerReference`,
`recordedAt → completedAt`, put `notes` on `Order.adminNotes`, and let
`logActivity` be the record of who did it — it is the system already designed
for that and it is tamper-auditable.

If you want true first-class `recordedBy`/`notes` columns on Payment, say so
and I will write the migration as its own step — but it is not needed for the
dashboard to work.

## BLOCKER 4 — `Order.paymentStatus` is not a column

Spec step 5: *"Update Order.paymentStatus (verify what field name is used
currently)"*. Verified: **there is no such column.** `paymentStatus` is
derived at read time in `/api/orders/[id]`:

```ts
paymentStatus: firstPayment?.status || "PENDING"
```

So creating the Payment row with `status: 'PAID'` **is** the update — nothing
else to write. Order gains `paymentReceivedAt` and `paymentMethod`, which are
real columns I already migrated in `ad37a33` and which nothing currently
writes.

**Proposal:** set `Order.paymentReceivedAt = now()` and
`Order.paymentMethod = <method>` in the same transaction. No fictional field.

## Question 5 — amount validation (you asked me to confirm)

**Confirmed: exact match, integer RWF comparison, 400 on mismatch.** Agreed —
partial/over payment is a separate feature with real complexity (balance
tracking, refunds, loyalty credit).

**But your stated remedy does not exist.** You wrote: *"If mismatch, admin
must edit order.total first."* There is no endpoint that can edit
`Order.total`. `PatchSchema` on `/api/orders/[id]` accepts only `status` and
`paymentStatus`. No admin route updates `total`.

So with exact-match, a negotiated WhatsApp price becomes **unrecordable** —
the admin is stuck. Three ways out, **your call**:

- **(a)** Exact match now; negotiated orders simply cannot be recorded until a
  separate "edit order total" feature exists. Safest, but leaves a real
  workflow dead-ended, and haggling is normal in Kigali retail.
- **(b)** Exact match by default, allow an explicit
  `allowMismatch: true` + mandatory `notes` to record a different amount.
  Difference is logged via `logActivity`. Keeps the guardrail, provides an
  audited escape hatch.
- **(c)** Build "edit order total" as its own endpoint first. Most correct,
  but it is a new feature and it touches money.

I lean **(b)** — it matches how the shop actually operates without inventing
a pricing-edit surface inside a payment endpoint.

## Question 6 — role `ORDER_MANAGER` does not exist

Spec: *"SUPER_ADMIN or ORDER_MANAGER"*. Roles are
`SUPER_ADMIN | ADMIN | MANAGER | STAFF`. There is no `ORDER_MANAGER`.

Recording money is payment-sensitive, and the codebase already has a policy
for exactly this:

```ts
PAYMENT_STATUS_CHANGE: { roles: ['SUPER_ADMIN', 'ADMIN'],
                         permission: PERMISSIONS.ORDERS_UPDATE }
```

**Proposal: reuse `requireDestructiveOperation(PAYMENT_STATUS_CHANGE)`.**
SUPER_ADMIN + ADMIN only, consistent with every other payment mutation. MANAGER
and STAFF cannot record money — which I think is right, but flag it if you
want MANAGER included.

## Question 7 — idempotency mechanism

Spec requires "if endpoint called twice, doesn't create duplicate". The schema
gives a clean way: `providerTransactionId` is `@unique`.

**Proposal:** refuse if the order already has a `PAID` payment (409, returning
the existing payment id). If the admin supplies a `reference`, also write it to
`providerTransactionId` so the database itself enforces uniqueness against
double entry of the same MoMo transaction. A retry with the same reference then
fails at the unique index rather than creating a second row.

---

## Summary — what I need from you

| # | Item | My proposal | Needs you? |
|---|---|---|---|
| 1 | `COMPLETED` status | use `PAID` | confirm |
| 2 | `MOMO`/`AIRTEL` | use `MTN_MOMO`/`AIRTEL_MONEY`; **`CASH` new** | **decide** |
| 3 | 4 missing columns | map to existing, zero migrations | confirm |
| 4 | `Order.paymentStatus` | derived — set `paymentReceivedAt`/`paymentMethod` | confirm |
| 5 | amount mismatch | **(b)** audited override w/ mandatory notes | **decide** |
| 6 | `ORDER_MANAGER` | `PAYMENT_STATUS_CHANGE` → SUPER_ADMIN + ADMIN | **decide** |
| 7 | idempotency | 409 if already PAID + unique `providerTransactionId` | confirm |

Nothing written until 2, 5 and 6 are answered.
