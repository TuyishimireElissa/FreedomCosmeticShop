/**
 * POST /api/admin/orders/[id]/record-payment
 *
 * Defect 2: WhatsApp orders are created with no Payment row, so every admin
 * surface read them as "COD / PENDING" and the mark-paid guard refused them.
 * This endpoint creates the row.
 *
 * These tests drive the real handler against a mocked Prisma so they assert
 * what is actually written to the database — a source-text assertion would
 * pass even if the route wrote the wrong status value, which is precisely the
 * defect class this endpoint exists to avoid.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  createdPayments: [] as Array<Record<string, unknown>>,
  orderUpdates: [] as Array<Record<string, unknown>>,
  activity: [] as Array<Record<string, unknown>>,
  destructiveCalls: [] as string[],
  rateLimitAllowed: true,
  failCreateWith: null as { code: string } | null,
}))

vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: async () => [],
    order: {
      findUnique: async () => state.order,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        state.orderUpdates.push(data)
        return { ...(state.order as object), ...data }
      },
    },
    payment: {
      create: async ({ data, select }: { data: Record<string, unknown>; select?: unknown }) => {
        if (state.failCreateWith) throw state.failCreateWith
        state.createdPayments.push(data)
        void select
        return { id: 'pay-new', ...data }
      },
    },
  }
  return { prisma: { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } }
})

vi.mock('@/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/permissions')>()
  return {
    ...actual,
    requireDestructiveOperation: async (op: string) => {
      state.destructiveCalls.push(op)
      return { id: 'admin-1', name: 'Owner', role: 'SUPER_ADMIN', email: 'owner@example.rw' }
    },
    rateLimit: () => (state.rateLimitAllowed ? { allowed: true, remaining: 29 } : { allowed: false, retryAfterMs: 5000, remaining: 0 }),
  }
})

vi.mock('@/server/services/activity', () => ({
  logActivity: async (entry: Record<string, unknown>) => { state.activity.push(entry) },
}))

const { POST } = await import('@/app/api/admin/orders/[id]/record-payment/route')

function seed(overrides: Record<string, unknown> = {}) {
  state.order = {
    id: 'order-1',
    orderNumber: 'FC-20260809-1234',
    status: 'CONFIRMED',
    total: 7000,
    adminNotes: null,
    payments: [],
    ...overrides,
  }
  state.createdPayments = []
  state.orderUpdates = []
  state.activity = []
  state.destructiveCalls = []
  state.rateLimitAllowed = true
  state.failCreateWith = null
}

function post(body: unknown, raw?: string) {
  return POST(
    new Request('https://example.rw/api/admin/orders/order-1/record-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw ?? JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'order-1' }) },
  )
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  seed()
})

describe('recording a payment that has arrived', () => {
  it.each(['MTN_MOMO', 'AIRTEL_MONEY', 'CASH'])('records a %s payment', async (method) => {
    const res = await post({ method, amount: 7000 })
    expect(res.status).toBe(201)
    const payment = state.createdPayments[0]
    expect(payment).toMatchObject({ orderId: 'order-1', method, amount: 7000, status: 'PAID' })
  })

  it("writes status 'PAID', never 'COMPLETED'", async () => {
    // 'COMPLETED' is invisible to the analytics funnel, the CSV export and the
    // admin colour logic, all of which match on 'PAID'.
    await post({ method: 'CASH', amount: 7000 })
    expect(state.createdPayments[0]!.status).toBe('PAID')
    expect(state.createdPayments[0]!.status).not.toBe('COMPLETED')
  })

  it('uses the existing method vocabulary so analytics buckets do not split', async () => {
    // PAYMENT_METHODS in lib/format.ts keys on MTN_MOMO / AIRTEL_MONEY.
    expect((await post({ method: 'MOMO', amount: 7000 })).status).toBe(400)
    expect((await post({ method: 'AIRTEL', amount: 7000 })).status).toBe(400)
  })

  it('stamps the order with paymentReceivedAt and the method', async () => {
    await post({ method: 'MTN_MOMO', amount: 7000 })
    const update = state.orderUpdates[0]!
    expect(update.paymentMethod).toBe('MTN_MOMO')
    expect(update.paymentReceivedAt).toBeInstanceOf(Date)
  })

  it('never changes Order.status — that is the separate transition endpoint', async () => {
    await post({ method: 'CASH', amount: 7000 })
    expect(state.orderUpdates[0]).not.toHaveProperty('status')
  })

  it('appends notes to Order.adminNotes without discarding earlier ones', async () => {
    seed({ adminNotes: 'Existing note' })
    await post({ method: 'CASH', amount: 7000, notes: 'Paid in shop' })
    expect(String(state.orderUpdates[0]!.adminNotes)).toContain('Existing note')
    expect(String(state.orderUpdates[0]!.adminNotes)).toContain('Paid in shop')
  })

  it('stores a reference on both the readable and the unique column', async () => {
    await post({ method: 'MTN_MOMO', amount: 7000, reference: 'MP2608091234' })
    expect(state.createdPayments[0]).toMatchObject({
      providerReference: 'MP2608091234',
      providerTransactionId: 'manual:MP2608091234',
    })
  })

  it('returns the identifiers the dashboard needs', async () => {
    const body = await (await post({ method: 'CASH', amount: 7000 })).json()
    expect(body.data).toMatchObject({
      paymentId: 'pay-new', orderId: 'order-1', orderNumber: 'FC-20260809-1234',
      amount: 7000, paymentStatus: 'PAID', amountMatchedOrderTotal: true,
    })
  })
})

describe('amount validation', () => {
  it('refuses an amount that does not match the order total', async () => {
    const res = await post({ method: 'CASH', amount: 6500 })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'AMOUNT_MISMATCH', expected: 7000, received: 6500 })
    expect(state.createdPayments).toEqual([])
  })

  it('allows a negotiated amount only with an explicit override AND notes', async () => {
    const res = await post({ method: 'CASH', amount: 6500, allowMismatch: true, notes: 'Negotiated on WhatsApp' })
    expect(res.status).toBe(201)
    expect(state.createdPayments[0]!.amount).toBe(6500)
  })

  it('rejects an override with no explanation', async () => {
    const res = await post({ method: 'CASH', amount: 6500, allowMismatch: true })
    expect(res.status).toBe(400)
    expect(state.createdPayments).toEqual([])
  })

  it('logs a mismatch as a warning naming both amounts', async () => {
    await post({ method: 'CASH', amount: 6500, allowMismatch: true, notes: 'Negotiated' })
    const entry = state.activity[0]!
    expect(entry.severity).toBe('warn')
    expect(String(entry.description)).toContain('6500')
    expect(String(entry.description)).toContain('7000')
  })

  it('rejects zero and negative amounts', async () => {
    expect((await post({ method: 'CASH', amount: 0 })).status).toBe(400)
    expect((await post({ method: 'CASH', amount: -7000 })).status).toBe(400)
  })
})

describe('order state gating', () => {
  it.each(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'])('accepts %s', async (status) => {
    seed({ status })
    expect((await post({ method: 'CASH', amount: 7000 })).status).toBe(201)
  })

  it.each(['PENDING_WHATSAPP', 'PENDING', 'CANCELLED', 'RETURNED'])('refuses %s', async (status) => {
    seed({ status })
    const res = await post({ method: 'CASH', amount: 7000 })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'ORDER_NOT_RECORDABLE' })
    expect(state.createdPayments).toEqual([])
  })

  it('404s an order that does not exist', async () => {
    state.order = null
    expect((await post({ method: 'CASH', amount: 7000 })).status).toBe(404)
  })
})

describe('idempotency and authorization', () => {
  it('refuses a second recording and names the existing payment', async () => {
    seed({ payments: [{ id: 'pay-old', status: 'PAID', method: 'CASH' }] })
    const res = await post({ method: 'CASH', amount: 7000 })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'ALREADY_PAID', paymentId: 'pay-old' })
    expect(state.createdPayments).toEqual([])
  })

  it('still records when an earlier attempt merely FAILED', async () => {
    seed({ payments: [{ id: 'pay-old', status: 'FAILED', method: 'MTN_MOMO' }] })
    expect((await post({ method: 'CASH', amount: 7000 })).status).toBe(201)
  })

  it('translates a duplicate reference into 409, not 500', async () => {
    state.failCreateWith = { code: 'P2002' }
    const res = await post({ method: 'MTN_MOMO', amount: 7000, reference: 'MP1' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'DUPLICATE_REFERENCE' })
  })

  it('demands the payment-change policy, not a weaker permission', async () => {
    await post({ method: 'CASH', amount: 7000 })
    expect(state.destructiveCalls).toEqual(['PAYMENT_STATUS_CHANGE'])
  })

  it('rate limits', async () => {
    state.rateLimitAllowed = false
    const res = await post({ method: 'CASH', amount: 7000 })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
    expect(state.createdPayments).toEqual([])
  })

  it('writes an audit entry naming the order and the admin', async () => {
    await post({ method: 'MTN_MOMO', amount: 7000 })
    expect(state.activity[0]).toMatchObject({
      action: 'PAYMENT_RECORDED', entityType: 'ORDER', entityId: 'order-1', userId: 'admin-1',
    })
    expect(String(state.activity[0]!.description)).toContain('FC-20260809-1234')
  })

  it('rejects malformed JSON and unknown fields', async () => {
    expect((await post(null, '{oops')).status).toBe(400)
    expect((await post({ method: 'CASH', amount: 7000, sneaky: true })).status).toBe(400)
  })

  it('never caches a money response', async () => {
    const res = await post({ method: 'CASH', amount: 7000 })
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0')
  })
})
