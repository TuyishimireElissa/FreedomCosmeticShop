export const dynamic = 'force-dynamic'

import { randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'
import { calculateDelivery } from '@/server/services/delivery.service'
import { normalizeRwandaPhone } from '@/lib/phone'
import { formatOrderReference } from '@/lib/whatsapp/buildOrderMessage'

/**
 * POST /api/orders/whatsapp
 *
 * Saves a WhatsApp order BEFORE the client opens wa.me, so an order always
 * exists even if the customer never sends the message. Prices are recomputed
 * from the database — the client's totals are used only to detect tampering,
 * never trusted.
 */

const lineSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(99),
})

const schema = z
  .object({
    customerName: z.string().trim().min(2).max(100),
    /**
     * Accepts any common Rwandan format and stores the canonical +250 form.
     *
     * This rejected every real order until now. The checkout form keeps the
     * phone display-formatted — `formatRwandaPhoneDisplay` renders
     * "+250 788 123 456" with spaces — and posted that string verbatim, but
     * the regex here had no room for whitespace, so every single WhatsApp
     * order failed validation with INVALID_PHONE. The older
     * /api/orders/create route allows `[0-9+\-\s]+`, which is why only this
     * path broke.
     *
     * Normalising in the schema rather than loosening the regex fixes both
     * halves of the problem: the customer can type spaces, dashes or
     * parentheses, and the database gets one consistent format instead of
     * whatever the form happened to render. `normalizeRwandaPhone` already
     * strips separators and validates; it throws on genuine rubbish, which
     * the catch turns back into INVALID_PHONE.
     */
    customerPhone: z
      .string()
      .max(30)
      .transform((value, ctx) => {
        try {
          return normalizeRwandaPhone(value)
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'INVALID_PHONE' })
          return z.NEVER
        }
      }),
    customerEmail: z.string().email().max(254).optional().or(z.literal('')),
    province: z.string().trim().min(2).max(60),
    district: z.string().trim().min(2).max(60),
    sector: z.string().trim().min(2).max(60),
    cell: z.string().trim().max(60).optional().or(z.literal('')),
    village: z.string().trim().max(60).optional().or(z.literal('')),
    landmark: z.string().trim().max(200).optional().or(z.literal('')),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
    couponCode: z.string().trim().max(50).optional().or(z.literal('')),
    language: z.enum(['rw', 'en']).default('rw'),
    items: z.array(lineSchema).min(1).max(50),
  })
  .strict()

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

/** Collision-resistant 4-digit suffix, retried against the unique index. */
async function generateReference(now: Date): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = formatOrderReference(now, String(randomInt(0, 10_000)).padStart(4, '0'))
    const clash = await prisma.order.findUnique({ where: { orderNumber: reference }, select: { id: true } })
    if (!clash) return reference
  }
  throw new Error('REFERENCE_EXHAUSTED')
}

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin) {
      return NextResponse.json({ success: false, error: 'INVALID_ORIGIN' }, { status: 403, headers })
    }

    const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const clientKey = forwarded.split(',')[0]!.trim()
    const limit = rateLimit(`whatsapp-order:${clientKey}`, { maxActions: 12, windowMs: 15 * 60 * 1000 })
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429, headers })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'INVALID_JSON' }, { status: 400, headers })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_INPUT',
          issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), code: issue.message })),
        },
        { status: 400, headers },
      )
    }
    const input = parsed.data

    // Re-fetch every product server-side. A client cannot inject a price or
    // resurrect a deleted product.
    const productIds = input.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, isDeleted: false },
      select: { id: true, name: true, price: true, stock: true, volume: true, size: true },
    })

    // Data integrity only: an id that resolves to nothing cannot be priced, so
    // the order cannot be built. This is NOT a stock condition — it means the
    // line references a product that is deleted, deactivated, or was never a
    // product at all (a bundle id, or a stale localStorage cart, which
    // persists indefinitely).
    //
    // Reported as UNKNOWN_ITEM with the offending ids rather than folded into
    // a stock error. It previously returned PRODUCT_UNAVAILABLE, which the
    // client mapped onto "one of your products is out of stock" — a lie that
    // sent the customer hunting for a stock problem that did not exist.
    const byId = new Map(products.map((product) => [product.id, product]))
    const missing = [...new Set(productIds)].filter((id) => !byId.has(id))
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'UNKNOWN_ITEM', productIds: missing },
        { status: 400, headers },
      )
    }

    // NO STOCK GATE HERE — deliberate.
    //
    // The business model is WhatsApp-first: this endpoint records intent, it
    // does not reserve inventory. Stock moves in exactly one place, the
    // source-gated PENDING_WHATSAPP -> CONFIRMED transition in
    // /api/orders/[id] (Defect 3), which holds row locks and refuses to
    // oversell with a 409.
    //
    // Rejecting at creation was wrong on its own terms: it threw away a lead
    // the owner could have fulfilled from a restock or by offering an
    // alternative over WhatsApp, which is the entire point of the channel.
    // The owner reconciles reality at confirmation time in the admin
    // dashboard, where they can see the shortfall and talk to the customer.
    //
    // `stock` is still selected above so the response can carry it, letting
    // the client show honest availability without blocking anything.
    const orderItems: Array<{ productId: string; name: string; price: number; quantity: number; variant: string | null }> = []
    for (const item of input.items) {
      const product = byId.get(item.productId)!
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        variant: product.volume || product.size || null,
      })
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Coupon revalidated server-side; an expired or ineligible code is ignored
    // rather than rejected, so the order still completes.
    let discountAmount = 0
    let couponId: string | null = null
    let couponCode: string | null = null
    if (input.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: input.couponCode.toUpperCase(), isActive: true },
      })
      if (coupon) {
        // Same validity rules as /api/orders/create, using the real Coupon
        // fields: type/value, startsAt/endsAt, usageLimit.
        const at = new Date()
        const validWindow = coupon.startsAt <= at && (!coupon.endsAt || coupon.endsAt >= at)
        const usageAvailable = coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit
        const minimumMet = coupon.minOrderAmount === null || subtotal >= coupon.minOrderAmount
        if (validWindow && usageAvailable && minimumMet) {
          const raw =
            coupon.type === 'PERCENTAGE'
              ? Math.floor((subtotal * coupon.value) / 100)
              : Math.min(coupon.value, subtotal)
          discountAmount = coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw
          couponId = coupon.id
          couponCode = coupon.code
        }
      }
    }

    const delivery = calculateDelivery(input.district, subtotal - discountAmount)
    const total = Math.max(0, subtotal - discountAmount + delivery.fee)

    const now = new Date()
    const orderNumber = await generateReference(now)
    const user = await requireAuth().catch(() => null)

    const created = await prisma.$transaction(async (tx) =>
      tx.order.create({
        data: {
          orderNumber,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail || null,
          userId: user?.id || null,
          address: [input.landmark, input.village, input.cell].filter(Boolean).join(', ') || input.sector,
          city: input.sector,
          district: input.district,
          sector: input.sector,
          province: input.province,
          notes: input.notes || null,
          subtotal,
          discountAmount,
          deliveryFee: delivery.fee,
          total,
          couponId,
          loyaltyPointsEarned: Math.floor(total / 1000),
          // Distinct from PENDING so WhatsApp orders are filterable in admin
          // and never confused with an abandoned online payment.
          status: 'PENDING_WHATSAPP',
          whatsappSentAt: now,
          paymentMethod: 'PENDING',
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        select: { id: true, orderNumber: true, createdAt: true },
      }),
    )

    // Lines the shop cannot currently cover in full. Reported, never blocking:
    // the order is already saved by this point. The owner sees the shortfall
    // in the admin dashboard and settles it with the customer over WhatsApp,
    // and the CONFIRMED transition is what actually enforces stock.
    const shortfalls = orderItems
      .map((item) => ({ item, available: byId.get(item.productId)!.stock }))
      .filter(({ item, available }) => available < item.quantity)
      .map(({ item, available }) => ({
        productId: item.productId,
        name: item.name,
        requested: item.quantity,
        available: Math.max(0, available),
      }))

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: created.id,
          orderReference: created.orderNumber,
          items: orderItems.map((item) => ({
            name: item.name,
            variant: item.variant,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
          })),
          pricing: { subtotal, deliveryFee: delivery.fee, discount: discountAmount, couponCode, total },
          ...(shortfalls.length > 0 ? { stockShortfalls: shortfalls } : {}),
        },
      },
      { status: 201, headers },
    )
  } catch (error) {
    console.error('[whatsapp-order] failed', error)
    return NextResponse.json({ success: false, error: 'SERVER_ERROR' }, { status: 500, headers })
  }
}
