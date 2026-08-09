/**
 * PATCH /api/orders/[id] — order status state machine.
 *
 * Regression cover for a defect shipped in `ad37a33`: the WhatsApp checkout
 * writes `status: 'PENDING_WHATSAPP'`, but that value was missing from
 * ALLOWED_STATUS_TRANSITIONS. The lookup fell back to `[]`, so every
 * transition — including CANCELLED — returned 409 and the order was frozen
 * for good.
 *
 * These tests drive the real PATCH handler rather than reading the file as
 * text, so they fail if the transition table regresses even when the source
 * still *mentions* PENDING_WHATSAPP. Legacy transitions are asserted in the
 * same file to prove the fix is additive.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  updates: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/db', () => {
  const findOrder = async () => state.order
  const updateOrder = async ({ data }: { data: Record<string, unknown> }) => {
    state.updates.push(data)
    state.order = { ...(state.order as object), ...data }
    return state.order
  }
  // PENDING_WHATSAPP -> CONFIRMED now runs the stock decrement inside a
  // transaction (Defect 3). These orders carry no items in this suite, so the
  // decrement is a no-op — but the surface has to exist or the route 500s.
  // Stock behaviour itself is covered in whatsapp-stock-decrement.test.ts.
  const tx = {
    $queryRaw: async () => [],
    orderItem: { findMany: async () => [] },
    product: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    order: { update: updateOrder },
    securityAlert: { create: async () => ({}) },
  }
  return {
    db: {
      $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
      order: {
        findFirst: findOrder,
        findUnique: findOrder,
        update: updateOrder,
      },
      payment: { update: async () => ({}), updateMany: async () => ({ count: 0 }) },
      delivery: { update: async () => ({}), updateMany: async () => ({ count: 0 }) },
      wholesaleInvoice: { updateMany: async () => ({ count: 0 }) },
    },
  }
})

vi.mock('@/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/permissions')>()
  const admin = { id: 'admin-1', name: 'Owner', role: 'SUPER_ADMIN', email: 'owner@example.rw' }
  return {
    ...actual,
    requirePermission: async () => admin,
    requireDestructiveOperation: async () => admin,
    rateLimit: () => ({ allowed: true, remaining: 99 }),
  }
})

vi.mock('@/lib/realtime', () => ({
  broadcastOrderEvent: async () => {},
  broadcastDeliveryEvent: async () => {},
}))
vi.mock('@/server/services/activity', () => ({ logActivity: async () => {} }))
vi.mock('@/lib/review-requests', () => ({ createReviewRequests: async () => {} }))
vi.mock('@/server/services/wholesale-retention', () => ({ refreshWholesaleRetentionMetric: async () => {} }))
vi.mock('@/server/services/sms-queue', () => ({ enqueueSms: () => {} }))
vi.mock('@/server/services/sms-templates', () => ({ getSmsMessage: () => 'sms' }))

const { PATCH } = await import('@/app/api/orders/[id]/route')

/** Seeds the order the handler will read. `payments: []` matches a real
 *  WhatsApp order — the checkout route creates no Payment row. */
function seed(overrides: Record<string, unknown> = {}) {
  state.order = {
    id: 'order-1',
    orderNumber: 'FC-20260809-1234',
    status: 'PENDING_WHATSAPP',
    total: 7000,
    userId: null,
    orderType: 'RETAIL',
    customerPhone: '+250788123456',
    payments: [],
    delivery: null,
    ...overrides,
  }
  state.updates = []
}

function patch(status: string) {
  const req = new Request('https://example.rw/api/orders/order-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return PATCH(req, { params: Promise.resolve({ id: 'order-1' }) })
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  seed()
})

describe('PENDING_WHATSAPP is not a dead end', () => {
  it('accepts PENDING_WHATSAPP → CONFIRMED', async () => {
    const res = await patch('CONFIRMED')
    expect(res.status).toBe(200)
    // Proves the DB write happened, not merely that the guard let it through.
    expect(state.updates).toContainEqual({ status: 'CONFIRMED' })
  })

  it('accepts PENDING_WHATSAPP → CANCELLED so a no-show can be closed', async () => {
    const res = await patch('CANCELLED')
    expect(res.status).toBe(200)
    expect(state.updates).toContainEqual({ status: 'CANCELLED' })
  })

  it.each(['PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED'])(
    'still refuses PENDING_WHATSAPP → %s (no stage skipping)',
    async (target) => {
      const res = await patch(target)
      expect(res.status).toBe(409)
      expect(state.updates).toEqual([])
    },
  )

  it('confirms a WhatsApp order despite it having no Payment row', async () => {
    // The CONFIRMED guard reads payments[0]; an empty array must not block it.
    seed({ payments: [] })
    expect((await patch('CONFIRMED')).status).toBe(200)
  })

  it('reaches DELIVERED through the full chain', async () => {
    expect((await patch('CONFIRMED')).status).toBe(200)
    expect((await patch('PROCESSING')).status).toBe(200)
    expect((await patch('SHIPPED')).status).toBe(200)
    expect((await patch('DELIVERED')).status).toBe(200)
    expect(state.order?.status).toBe('DELIVERED')
  })
})

describe('legacy transitions are unchanged', () => {
  it.each([
    ['PENDING', 'CONFIRMED'],
    ['CONFIRMED', 'PROCESSING'],
    ['PROCESSING', 'SHIPPED'],
    ['SHIPPED', 'DELIVERED'],
    ['SHIPPED', 'RETURNED'],
    ['DELIVERED', 'RETURNED'],
  ])('allows %s → %s', async (from, to) => {
    seed({ status: from })
    expect((await patch(to)).status).toBe(200)
  })

  it.each([
    ['PENDING', 'SHIPPED'],
    ['CONFIRMED', 'DELIVERED'],
    ['CANCELLED', 'CONFIRMED'],
    ['RETURNED', 'CONFIRMED'],
    ['DELIVERED', 'CANCELLED'],
  ])('refuses %s → %s', async (from, to) => {
    seed({ status: from })
    expect((await patch(to)).status).toBe(409)
  })

  it('rejects a status outside the vocabulary with 400, not 409', async () => {
    const res = await patch('TELEPORTED')
    expect(res.status).toBe(400)
  })

  it('keeps refusing to confirm an unpaid online order', async () => {
    seed({ status: 'PENDING', payments: [{ id: 'p1', method: 'MTN_MOMO', status: 'PENDING' }] })
    const res = await patch('CONFIRMED')
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('verified payment') })
  })
})
