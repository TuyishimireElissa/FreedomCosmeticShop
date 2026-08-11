/**
 * WhatsApp order creation must not check stock.
 *
 * Reported by the owner: tapping "Ohereza order kuri WhatsApp" showed
 * "Kimwe mu bicuruzwa wahisemo cyashize" (one of your products is out of
 * stock) followed by "Ntitwashoboye kubika order yawe".
 *
 * The endpoint rejected creation with 409 INSUFFICIENT_STOCK whenever a line
 * exceeded `product.stock`. That is wrong for a WhatsApp-first shop: this
 * endpoint records intent, it does not reserve inventory. Stock moves in
 * exactly one place — the source-gated PENDING_WHATSAPP -> CONFIRMED
 * transition in /api/orders/[id] (Defect 3). Rejecting at creation threw away
 * a lead the owner could have filled from a restock or by offering an
 * alternative over WhatsApp, which is the whole point of the channel.
 *
 * These tests drive the REAL route handler with Prisma mocked, so they assert
 * behaviour rather than the shape of the source file.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  products: [] as Array<{
    id: string
    name: string
    price: number
    stock: number
    volume: string | null
    size: string | null
  }>,
  created: null as Record<string, unknown> | null,
  createdItems: [] as Array<{ productId: string; quantity: number }>,
  /** Every product.update / updateMany the route attempts. Must stay empty. */
  stockWrites: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/prisma', () => {
  const product = {
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      state.products.filter((p) => where.id.in.includes(p.id)),
    ),
    update: vi.fn(async (args: Record<string, unknown>) => {
      state.stockWrites.push(args)
      return {}
    }),
    updateMany: vi.fn(async (args: Record<string, unknown>) => {
      state.stockWrites.push(args)
      return { count: 1 }
    }),
  }
  const order = {
    findUnique: vi.fn(async () => null), // no reference collision
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      state.created = data
      const nested = data.items as { create: Array<{ productId: string; quantity: number }> }
      state.createdItems = nested.create
      return { id: 'order_1', orderNumber: data.orderNumber, createdAt: new Date() }
    }),
  }
  const client = {
    product,
    order,
    coupon: { findFirst: vi.fn(async () => null) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ product, order })),
  }
  return { prisma: client, db: client }
})

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn(async () => null) }))
vi.mock('@/lib/permissions', () => ({ rateLimit: vi.fn(() => ({ allowed: true })) }))
vi.mock('@/server/services/delivery.service', () => ({
  calculateDelivery: vi.fn(() => ({ fee: 1000, days: 1, zone: 'KIGALI_SAME_DAY' })),
}))

const { POST } = await import('@/app/api/orders/whatsapp/route')

function body(overrides: Record<string, unknown> = {}) {
  return {
    customerName: 'Test Buyer',
    customerPhone: '+250 788 123 456',
    province: 'Kigali City',
    district: 'Nyarugenge',
    sector: 'Nyarugenge',
    language: 'rw',
    items: [{ productId: 'p1', quantity: 1 }],
    ...overrides,
  }
}

const post = (payload: unknown) =>
  POST(
    new Request('https://shop.test/api/orders/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )

beforeEach(() => {
  state.products = [
    { id: 'p1', name: 'Rose Serum', price: 6000, stock: 5, volume: '50 ml', size: null },
  ]
  state.created = null
  state.createdItems = []
  state.stockWrites = []
})

describe('stock never blocks WhatsApp order creation', () => {
  it('creates the order when the quantity exceeds stock', async () => {
    state.products[0]!.stock = 5
    const response = await post(body({ items: [{ productId: 'p1', quantity: 80 }] }))
    const payload = await response.json()

    expect(response.status, JSON.stringify(payload)).toBe(201)
    expect(payload.success).toBe(true)
    expect(payload.data.orderReference).toMatch(/^FC-\d{8}-\d{4}$/)
  })

  it('creates the order when stock is exactly zero', async () => {
    state.products[0]!.stock = 0
    const response = await post(body({ items: [{ productId: 'p1', quantity: 2 }] }))

    expect(response.status).toBe(201)
    expect(state.created?.status).toBe('PENDING_WHATSAPP')
  })

  it('never returns INSUFFICIENT_STOCK', async () => {
    state.products[0]!.stock = 0
    const payload = await (await post(body({ items: [{ productId: 'p1', quantity: 99 }] }))).json()
    expect(payload.error).toBeUndefined()
  })

  it('records the full requested quantity, not a clamped one', async () => {
    // Silently trimming 80 to 5 would be worse than rejecting: the customer
    // would send a WhatsApp message for an order they did not place.
    state.products[0]!.stock = 5
    await post(body({ items: [{ productId: 'p1', quantity: 80 }] }))
    expect(state.createdItems).toHaveLength(1)
    expect(state.createdItems[0]!.quantity).toBe(80)
  })

  it('prices the line from the database, never from the client', async () => {
    await post(body({ items: [{ productId: 'p1', quantity: 3 }] }))
    expect(state.created?.subtotal).toBe(18_000) // 3 x 6000, server price
  })
})

describe('creation does not move inventory', () => {
  it('writes no stock change at all', async () => {
    state.products[0]!.stock = 5
    await post(body({ items: [{ productId: 'p1', quantity: 80 }] }))
    // Defect 3 owns the decrement. A write here would double-count once the
    // owner confirms the order.
    expect(state.stockWrites).toEqual([])
  })

  it('sets the status Defect 3 gates its decrement on', async () => {
    await post(body())
    // The decrement is source-gated on oldStatus === 'PENDING_WHATSAPP'.
    // Any other status here would silently disable it.
    expect(state.created?.status).toBe('PENDING_WHATSAPP')
  })
})

describe('the shortfall is reported without blocking', () => {
  it('lists lines the shop cannot currently cover', async () => {
    state.products[0]!.stock = 5
    const payload = await (await post(body({ items: [{ productId: 'p1', quantity: 80 }] }))).json()

    expect(payload.data.stockShortfalls).toEqual([
      { productId: 'p1', name: 'Rose Serum', requested: 80, available: 5 },
    ])
  })

  it('omits the field entirely when everything is covered', async () => {
    state.products[0]!.stock = 50
    const payload = await (await post(body({ items: [{ productId: 'p1', quantity: 2 }] }))).json()
    expect(payload.data.stockShortfalls).toBeUndefined()
  })

  it('never reports a negative availability', async () => {
    state.products[0]!.stock = -3 // corrupt data must not leak to the customer
    const payload = await (await post(body({ items: [{ productId: 'p1', quantity: 1 }] }))).json()
    expect(payload.data.stockShortfalls[0].available).toBe(0)
  })
})

describe('data integrity checks survive', () => {
  it('rejects an id that is not a sellable product', async () => {
    const response = await post(body({ items: [{ productId: 'bundle_x', quantity: 1 }] }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('UNKNOWN_ITEM')
    // Naming the offending line is the point: the customer is told which item
    // to remove instead of being sent to hunt for a stock problem.
    expect(payload.productIds).toEqual(['bundle_x'])
  })

  it('does not call it a stock problem', async () => {
    const payload = await (await post(body({ items: [{ productId: 'ghost', quantity: 1 }] }))).json()
    expect(payload.error).not.toBe('PRODUCT_UNAVAILABLE')
    expect(payload.error).not.toBe('INSUFFICIENT_STOCK')
  })

  it('still rejects a zero or negative quantity', async () => {
    for (const quantity of [0, -5]) {
      const response = await post(body({ items: [{ productId: 'p1', quantity }] }))
      expect(response.status, `quantity ${quantity}`).toBe(400)
    }
  })

  it('still rejects an empty basket', async () => {
    expect((await post(body({ items: [] }))).status).toBe(400)
  })

  it('still normalises the phone', async () => {
    await post(body({ customerPhone: '0788 123 456' }))
    expect(state.created?.customerPhone).toBe('+250788123456')
  })
})
