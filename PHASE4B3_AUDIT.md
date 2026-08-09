# Phase 4b-3 — Phase 0 audit

Read-only. No UI written. Baseline re-verified: **816 tests / 116 files**, HEAD `536935c`.

---

## What I can build exactly as specified

| Spec item | Status |
|---|---|
| `/admin/whatsapp-orders` page | ✅ pattern exists (`/admin/reviews`, `/admin/visitors`) |
| Filters by order status | ✅ (one correction, below) |
| Search by reference or phone | ✅ `/api/admin/orders` already does both |
| Table columns | ✅ all fields present on `Order` |
| Detail drawer: customer, items, pricing | ✅ `include: { items, payments, delivery }` returns everything |
| Status buttons respecting 4a | ✅ transition table is authoritative |
| Payment recording section | ✅ calls the Defect 2 endpoint |
| Open WhatsApp Chat | ✅ |
| Copy Order Message | ✅ |
| `fcs-*`, mobile-first, AA, reduced-motion | ✅ 51 `fcs-` rules + 3 reduced-motion blocks already in `globals.css` |
| No new packages | ✅ nothing needed |

Data confirmed available for every column and drawer field. `/api/admin/orders`
uses `include` with no `select`, so **all** `Order` scalars — including
`whatsappSentAt`, `paymentReceivedAt`, `paymentMethod`, `adminNotes` — are
already returned. It is paginated, permission-guarded (`ORDERS_READ`) and
`no-store`.

---

## Six conflicts needing a decision

### 1. `PAID` is not an order status — the filter cannot exist as written

Spec filters: All / PENDING_WHATSAPP / CONFIRMED / PROCESSING / SHIPPED /
DELIVERED / CANCELLED. That list is correct and matches `VALID_STATUSES`.

But the **spec text elsewhere** ("Paid" in the earlier Phase 4 brief, and the
`Paid today` widget) assumes PAID is a status. It is not — it lives on
`Payment.status`, exactly as established in the Defect 2 audit.

**Proposal:** keep the seven status filters as listed, and show payment state
as a **separate column/badge** derived from `payments[0].status`. A "Paid"
*filter* would then be a payment-state filter, not a status filter — I can add
it as a distinct control if you want, but it must not sit in the same group.

### 2. `RETURNED` is missing from the filter list

`VALID_STATUSES` has seven values; the spec lists six. `SHIPPED → RETURNED` and
`DELIVERED → RETURNED` are both legal transitions, so an order can reach a state
the dashboard cannot filter to — it would silently vanish from every view.

**Proposal:** add `RETURNED` to the filter list. Otherwise orders disappear.

### 3. Timeline — there is no status-history table

Spec: *"Timeline (status history with timestamps)"*. Verified: **no
`OrderStatusHistory` / `OrderEvent` / `StatusHistory` model exists.** Nothing
records per-status transition times.

What genuinely exists:

| Source | Gives |
|---|---|
| `Order.createdAt` / `whatsappSentAt` | order placed |
| `Order.whatsappConfirmedAt` | column exists, **nothing writes it** |
| `Order.paymentReceivedAt` | written by Defect 2 |
| `Delivery.assignedAt` / `pickedUpAt` / `deliveredAt` | delivery milestones |
| `ActivityLog` (`entityType='ORDER'`, indexed on `[entityType, entityId]`) | every `ORDER_UPDATE` + `PAYMENT_RECORDED` with admin name and timestamp |

`ActivityLog` is the real timeline and is already being written — live sample:

```
2026-08-09T19:21:02Z ORDER_UPDATE     Updated order FC-...-9624: PENDING_WHATSAPP → CONFIRMED
2026-08-09T18:42:43Z PAYMENT_RECORDED Recorded MTN_MOMO payment of 7500 RWF for order FC-...-2956
```

**Proposal:** build the timeline from `ActivityLog` + the real timestamp
columns. That needs a small read-only endpoint
(`GET /api/admin/orders/[id]/timeline`) because no existing route exposes
activity for one order. **Honest caveat:** it only covers events since the
audit log started, so older orders will show a short timeline. I will not
fabricate estimated dates for missing steps.

Alternative if you prefer zero new endpoints: show only the columns above (5
real timestamps, no admin names). Less useful, less work.

### 4. "Create Test Order" button writes to your **production** database

Spec puts this in the empty state. Verified: no such endpoint exists, and —
as established this session — local and Vercel **share one database**. There is
no staging. A button that seeds dummy orders is a button that writes fake
records into the same table as your six real orders, reachable from a
production admin page.

I also *cannot* make it harmless: it must produce a `PENDING_WHATSAPP` order to
be useful, and confirming that order will decrement real stock (Defect 3).

**Three options — your call:**

- **(a) Skip it.** I generate a real test order via script during live
  verification and delete it, exactly as I have done all session. You see the
  populated dashboard in my verification output. **My recommendation.**
- **(b) Build it, clearly marked.** Customer name hard-coded to
  `TEST ORDER — DELETE ME`, a `[TEST]` badge in the table, and a one-click
  delete. Still real rows in your real table.
- **(c) Build it behind an env flag** so it only appears when
  `ENABLE_TEST_ORDERS=true`, which is never set in production. Safe, but then
  the button is not there when you look — which defeats its purpose.

### 5. Copy-message template contains a claim and a hard-coded number

The template ends:

```
We'll confirm your delivery shortly.
Freedom Cosmetic Shop
+250 790 215 965
```

- *"We'll confirm your delivery shortly"* is a **response-time claim**. Your
  own standing rule (decision 2, `DECISIONS_AND_STATE.md`) is no time promises
  without an SLA. "Shortly" is soft, but it is still a promise to a customer.
  **Proposal:** *"We will contact you to confirm delivery."* — same meaning, no
  implied speed. Tell me if you want the original; it is your business.
- The phone number should come from `BUSINESS.whatsapp`
  (`WHATSAPP_ORDERING_NUMBERS[0]`, currently `+250790215965` — a **real**
  value, not an `OWNER_TODO`), not be hard-coded in the formatter. If you ever
  change numbers, one edit instead of two.

### 6. `wa.me/250[phone]` will produce broken links for some customers

Spec: `https://wa.me/250[customer_phone]`. Stored phones are **not** normalised
— the WhatsApp checkout accepts `+250788…`, `250788…`, `0788…` and `788…`.
Prefixing `250` blindly yields `wa.me/250+250788123456` or `wa.me/2500788…`,
both dead links.

**Proposal:** reuse the existing `normalizeWhatsAppNumber()` from
`src/lib/whatsapp/buildOrderMessage.ts` — written and tested in Phase 2 for
exactly this. No new logic.

---

## Two things I will do differently, flagging rather than asking

**Nav entry needs no `AdminTab` value.** You asked for `tab="whatsapp-orders"`
added to the union. Verified that href-based pages (`/admin/reviews`,
`/admin/visitors`, `/admin/whatsapp-guide`) are **not** in the `AdminTab` union
at all — they set an unrelated `tab` purely for icon highlighting and navigate
by `href`. Adding `'whatsapp-orders'` to the union would also require a
`TabsContent` case in `AdminView`, or the legacy dashboard renders **blank**
when that tab is selected. I will follow the established href pattern and give
the entry a **unique React `key`**, which was the actual goal — avoiding the
duplicate-key bug (`products` ×2, `analytics` ×4). No change to
`AdminShellContext`.

**Bilingual, but honest about the precedent.** Admin components are largely
English-only today (`AdminOverview`, `AdminLiveVisitors` use no `useT()`). I
will still do rw+en with `// verified-rw` markers as instructed — noting this
makes the new page more localised than its neighbours, which is fine but
inconsistent.

---

## Housekeeping found during the audit

Three `ActivityLog` rows reference orders I created and deleted during Defect
2/3 verification (`FC-20260809-2956`, `FC-20260809-9624`). Audit logs are
append-only by design and I will not delete them, but the timeline endpoint
must tolerate activity for orders that no longer exist. Noted so it does not
surprise either of us later.

---

## Decisions I need before writing UI

| # | Question | My recommendation |
|---|---|---|
| 1 | "Paid" as separate payment-state control? | separate column + optional filter |
| 2 | Add `RETURNED` filter? | yes — orders vanish otherwise |
| 3 | Timeline from `ActivityLog` (+1 read endpoint)? | yes |
| 4 | "Create Test Order" button? | **(a) skip** — I verify with a scripted order instead |
| 5 | Soften "confirm shortly"? | yes, no time claim |
| 6 | Normalise phones via existing helper? | yes |
