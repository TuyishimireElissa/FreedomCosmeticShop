/**
 * Defect 3 — stock decrement on PENDING_WHATSAPP -> CONFIRMED.
 *
 * /api/orders/whatsapp verifies stock at checkout but never decrements it, so
 * a WhatsApp order never reduced inventory. The decrement is gated on the
 * SOURCE status because every other path already takes its own stock:
 *
 *   COD retail       born CONFIRMED, stock taken at creation
 *   online retail    decremented by the payment webhook, which never calls PATCH
 *   wholesale/CREDIT created PENDING with stock ALREADY taken
 *
 * A `* -> CONFIRMED` rule would therefore double-decrement wholesale. The
 * no-double-decrement cases below are the reason this file exists.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  items: [] as Array<{ productId: string | null; name: string; quantity: number }>,
  products: [] as Array<{ id: string; name: string; stock: number; isActive: boolean; isDeleted: boolean }>,
  decrements: [] as Array<{ productId: string; by: number }>,
  orderUpdates: [] as Array<Record<string, unknown>>,
  alerts: [] as Array<Record<string, unknown>>,
  locks: [] as string[],
  txAborted: false,
  failDecrementFor: null as string | null,
}))

vi.mock('@/lib/db', () => {
  const findOrder = async () => state.order
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (String(strings.join('')).includes('"Product"')) state.locks.push(String(values[0]))
      return []
    },
    orderItem: { findMany: async () => state.items.filter((i) => i.productId !== null) },
    product: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        state.products.filter((p) => where.id.in.includes(p.id)),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: { stock: { decrement: number } } }) => {
        const id = where.id as string
        if (state.failDecrementFor === id) return { count: 0 }
        const product = state.products.find((p) => p.id === id)
        const need = (where.stock as { gte: number }).gte
        if (!product || !product.isActive || product.isDeleted || product.stock < need) return { count: 0 }
        product.stock -= data.stock.decrement
        state.decrements.push({ productId: id, by: data.stock.decrement })
        return { count: 1 }
      },
    },
    order: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        state.orderUpdates.push(data)
        state.order = { ...(state.order as object), ...data }
        return state.order
      },
    },
    securityAlert: { create: async ({ data }: { data: Record<string, unknown> }) => { state.alerts.push(data); return data } },
  }
  return {
    db: {
      // Snapshot/rollback so an aborted transaction leaves stock untouched,
      // the way a real database would.
      $transaction: async (fn: (t: typeof tx) => unknown) => {
        const snapshot = state.products.map((p) => ({ ...p }))
        const decrementsBefore = state.decrements.length
        const updatesBefore = state.orderUpdates.length
        const alertsBefore = state.alerts.length
        try {
          return await fn(tx)
        } catch (error) {
          state.products = snapshot
          state.decrements = state.decrements.slice(0, decrementsBefore)
          state.orderUpdates = state.orderUpdates.slice(0, updatesBefore)
          state.alerts = state.alerts.slice(0, alertsBefore)
          state.txAborted = true
          throw error
        }
      },
      order: { findFirst: findOrder, findUnique: findOrder, update: tx.order.update },
      payment: { update: async () => ({}), updateMany: async () => ({ count: 0 }) },
      delivery: { update: async () => ({}), updateMany: async () => ({ count: 0 }) },
      wholesaleInvoice: { updateMany: async () => ({ count: 0 }) },
    },
  }
})

vi.mock('@/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/permissions')>()
  const admin = { id: 'admin-1', name: 'Owner', role: 'SUPER_ADMIN', email: 'owner@example.rw' }
  return { ...actual, requirePermission: async () => admin, requireDestructiveOperation: async () => admin, rateLimit: () => ({ allowed: true, remaining: 99 }) }
})
vi.mock('@/lib/realtime', () => ({ broadcastOrderEvent: async () => {}, broadcastDeliveryEvent: async () => {} }))
vi.mock('@/server/services/activity', () => ({ logActivity: async () => {} }))
vi.mock('@/lib/review-requests', () => ({ createReviewRequests: async () => {} }))
vi.mock('@/server/services/wholesale-retention', () => ({ refreshWholesaleRetentionMetric: async () => {} }))
vi.mock('@/server/services/sms-queue', () => ({ enqueueSms: () => {} }))
vi.mock('@/server/services/sms-templates', () => ({ getSmsMessage: () => 'sms' }))

const { PATCH } = await import('@/app/api/orders/[id]/route')

function seed(opts: {
  status?: string
  items?: Array<{ productId: string | null; name: string; quantity: number }>
  products?: Array<{ id: string; name: string; stock: number; isActive?: boolean; isDeleted?: boolean }>
  payments?: Array<Record<string, unknown>>
} = {}) {
  state.order = {
    id: 'order-1', orderNumber: 'FC-20260809-1234', status: opts.status ?? 'PENDING_WHATSAPP',
    total: 7000, userId: null, orderType: 'RETAIL', customerPhone: '+250788123456',
    payments: opts.payments ?? [], delivery: null,
  }
  state.items = opts.items ?? [{ productId: 'p1', name: 'Serum', quantity: 2 }]
  state.products = (opts.products ?? [{ id: 'p1', name: 'Serum', stock: 10 }]).map((p) => ({
    isActive: true, isDeleted: false, ...p,
  }))
  state.decrements = []; state.orderUpdates = []; state.alerts = []; state.locks = []
  state.txAborted = false; state.failDecrementFor = null
}

function patch(status: string) {
  return PATCH(
    new Request('https://example.rw/api/orders/order-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id: 'order-1' }) },
  )
}

const stockOf = (id: string) => state.products.find((p) => p.id === id)!.stock

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  seed()
})

describe('successful decrement', () => {
  it('takes stock when a WhatsApp order is confirmed', async () => {
    expect((await patch('CONFIRMED')).status).toBe(200)
    expect(stockOf('p1')).toBe(8)
    expect(state.decrements).toEqual([{ productId: 'p1', by: 2 }])
  })

  it('moves the order to CONFIRMED in the same transaction', async () => {
    await patch('CONFIRMED')
    expect(state.orderUpdates).toContainEqual({ status: 'CONFIRMED' })
    expect(state.order?.status).toBe('CONFIRMED')
  })

  it('merges duplicate lines of the same product', async () => {
    seed({ items: [
      { productId: 'p1', name: 'Serum', quantity: 2 },
      { productId: 'p1', name: 'Serum', quantity: 3 },
    ], products: [{ id: 'p1', name: 'Serum', stock: 10 }] })
    await patch('CONFIRMED')
    expect(stockOf('p1')).toBe(5)
  })

  it('decrements every distinct product', async () => {
    seed({ items: [
      { productId: 'p1', name: 'Serum', quantity: 1 },
      { productId: 'p2', name: 'Lotion', quantity: 4 },
    ], products: [{ id: 'p1', name: 'Serum', stock: 5 }, { id: 'p2', name: 'Lotion', stock: 9 }] })
    await patch('CONFIRMED')
    expect(stockOf('p1')).toBe(4)
    expect(stockOf('p2')).toBe(5)
  })

  it('locks product rows in a deterministic order to avoid deadlock', async () => {
    // Three ids in an order where neither reverse() nor insertion order is
    // sorted, so a mutation to either is detectable. With two items,
    // reverse([p2,p1]) === sort([p2,p1]) and the assertion proves nothing.
    seed({ items: [
      { productId: 'p2', name: 'Lotion', quantity: 1 },
      { productId: 'p3', name: 'Balm', quantity: 1 },
      { productId: 'p1', name: 'Serum', quantity: 1 },
    ], products: [
      { id: 'p1', name: 'Serum', stock: 5 },
      { id: 'p2', name: 'Lotion', stock: 5 },
      { id: 'p3', name: 'Balm', stock: 5 },
    ] })
    await patch('CONFIRMED')
    expect(state.locks).toEqual(['p1', 'p2', 'p3'])
  })

  it('ignores bundle lines that carry no productId', async () => {
    seed({ items: [
      { productId: null, name: 'Gift bundle', quantity: 1 },
      { productId: 'p1', name: 'Serum', quantity: 1 },
    ], products: [{ id: 'p1', name: 'Serum', stock: 5 }] })
    expect((await patch('CONFIRMED')).status).toBe(200)
    expect(stockOf('p1')).toBe(4)
  })

  it('raises an alert when the last units are taken', async () => {
    seed({ items: [{ productId: 'p1', name: 'Serum', quantity: 5 }], products: [{ id: 'p1', name: 'Serum', stock: 5 }] })
    await patch('CONFIRMED')
    expect(stockOf('p1')).toBe(0)
    expect(state.alerts[0]).toMatchObject({ type: 'INSUFFICIENT_STOCK', severity: 'HIGH' })
  })

  it('raises no alert while stock remains', async () => {
    await patch('CONFIRMED')
    expect(state.alerts).toEqual([])
  })
})

describe('refusal and atomicity', () => {
  it('refuses with 409 and names the short product', async () => {
    seed({ items: [{ productId: 'p1', name: 'Serum', quantity: 9 }], products: [{ id: 'p1', name: 'Serum', stock: 3 }] })
    const res = await patch('CONFIRMED')
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      items: [{ productId: 'p1', name: 'Serum', needed: 9, available: 3 }],
    })
  })

  it('leaves stock AND status untouched when it refuses', async () => {
    seed({ items: [{ productId: 'p1', name: 'Serum', quantity: 9 }], products: [{ id: 'p1', name: 'Serum', stock: 3 }] })
    await patch('CONFIRMED')
    expect(stockOf('p1')).toBe(3)
    expect(state.order?.status).toBe('PENDING_WHATSAPP')
    expect(state.orderUpdates).toEqual([])
  })

  it('rolls back an earlier decrement when a later product is short', async () => {
    seed({ items: [
      { productId: 'p1', name: 'Serum', quantity: 1 },
      { productId: 'p2', name: 'Lotion', quantity: 99 },
    ], products: [{ id: 'p1', name: 'Serum', stock: 10 }, { id: 'p2', name: 'Lotion', stock: 1 }] })
    expect((await patch('CONFIRMED')).status).toBe(409)
    expect(stockOf('p1')).toBe(10)
    expect(state.txAborted).toBe(true)
  })

  it('rolls back when the optimistic lock loses a race', async () => {
    // Passes the read check, then updateMany matches 0 rows — another
    // transaction moved the stock in between.
    seed({ items: [
      { productId: 'p1', name: 'Serum', quantity: 1 },
      { productId: 'p2', name: 'Lotion', quantity: 1 },
    ], products: [{ id: 'p1', name: 'Serum', stock: 10 }, { id: 'p2', name: 'Lotion', stock: 10 }] })
    state.failDecrementFor = 'p2'
    expect((await patch('CONFIRMED')).status).toBe(409)
    expect(stockOf('p1')).toBe(10)
  })

  it.each([
    ['inactive', { isActive: false }],
    ['deleted', { isDeleted: true }],
  ])('refuses when a product is %s', async (_label, flags) => {
    seed({ items: [{ productId: 'p1', name: 'Serum', quantity: 1 }], products: [{ id: 'p1', name: 'Serum', stock: 10, ...flags }] })
    const res = await patch('CONFIRMED')
    expect(res.status).toBe(409)
    expect(stockOf('p1')).toBe(10)
    // The pre-flight availability check must be what refuses, reporting the
    // real stock figure. The updateMany filter is a second line of defence; if
    // only that one fired, the 409 would report available: 0 instead of 10 and
    // the shortfall list would be misleading to whoever reads it.
    expect(await res.json()).toMatchObject({ items: [{ productId: 'p1', needed: 1, available: 10 }] })
  })
})

describe('no other path may take stock', () => {
  it('does not decrement on PENDING -> CONFIRMED (wholesale already took it)', async () => {
    // The regression the source gate exists to prevent.
    seed({ status: 'PENDING' })
    expect((await patch('CONFIRMED')).status).toBe(200)
    expect(state.decrements).toEqual([])
    expect(stockOf('p1')).toBe(10)
  })

  it.each([
    ['CONFIRMED', 'PROCESSING'],
    ['PROCESSING', 'SHIPPED'],
    ['SHIPPED', 'DELIVERED'],
    ['DELIVERED', 'RETURNED'],
  ])('does not decrement on %s -> %s', async (from, to) => {
    seed({ status: from })
    await patch(to)
    expect(state.decrements).toEqual([])
  })

  it('does not decrement when a WhatsApp order is cancelled', async () => {
    expect((await patch('CANCELLED')).status).toBe(200)
    expect(state.decrements).toEqual([])
    expect(stockOf('p1')).toBe(10)
  })

  it('cannot decrement twice — the source status is gone after the first confirm', async () => {
    expect((await patch('CONFIRMED')).status).toBe(200)
    expect(stockOf('p1')).toBe(8)

    // Re-confirming an already-CONFIRMED order returns 200, not 409: the
    // route computes `statusChanged = target !== oldStatus`, so a same-status
    // PATCH skips the transition guard entirely. That is pre-existing
    // behaviour from before this change and is not what this test polices.
    // What matters is that stock is taken exactly once — the source status is
    // no longer PENDING_WHATSAPP, so the decrement branch cannot re-enter.
    expect((await patch('CONFIRMED')).status).toBe(200)
    expect(stockOf('p1')).toBe(8)
    expect(state.decrements).toHaveLength(1)
  })

  it('does not restore stock on CONFIRMED -> CANCELLED (documented pre-existing leak)', async () => {
    // Deliberate: asymmetric restore for WhatsApp only would be worse than the
    // uniform leak. Tracked in STOCK_CANCELLATION_LEAK.md.
    await patch('CONFIRMED')
    expect(stockOf('p1')).toBe(8)
    await patch('CANCELLED')
    expect(stockOf('p1')).toBe(8)
  })
})
