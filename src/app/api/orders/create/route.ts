export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateDelivery, getAllDistricts, getProvinceByDistrict } from '@/server/services/delivery.service'
import { calculateBundleFacts } from '@/lib/bundle-pricing'
import { sendOrderConfirmation } from '@/server/services/order-confirmation'

const lineSchema = z.object({
  productId: z.string().min(1).optional(),
  bundleId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(99),
}).refine((line) => Boolean(line.productId) !== Boolean(line.bundleId), 'Provide either productId or bundleId')
const schema = z.object({
  customerName: z.string().trim().min(2).max(100), customerPhone: z.string().regex(/^(?:\+250|250|0)?7[2389]\d{7}$/), customerEmail: z.string().email().optional().or(z.literal('')), language: z.enum(['en', 'rw']).default('rw'),
  address: z.string().trim().min(5).max(300), district: z.string(), sector: z.string().trim().min(2).max(100), notes: z.string().max(500).optional(), paymentMethod: z.enum(['MTN_MOMO','AIRTEL_MONEY','CARD','COD']), couponCode: z.string().max(50).optional(), items: z.array(lineSchema).min(1),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid order data', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    const input = parsed.data
    if (!getAllDistricts().includes(input.district)) return NextResponse.json({ success: false, error: 'Invalid Rwanda district' }, { status: 400 })
    const province = getProvinceByDistrict(input.district)
    if (input.paymentMethod === 'COD' && province !== 'Kigali City') return NextResponse.json({ success: false, error: 'Cash on Delivery is available in Kigali only' }, { status: 400 })

    const productLines = input.items.flatMap((item) => item.productId ? [{ productId: item.productId, quantity: item.quantity }] : [])
    const bundleLines = input.items.flatMap((item) => item.bundleId ? [{ bundleId: item.bundleId, quantity: item.quantity }] : [])
    const productIds = [...new Set(productLines.map((item) => item.productId))]
    const bundleIds = [...new Set(bundleLines.map((item) => item.bundleId))]
    const [products, bundles] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds }, isActive: true, isDeleted: false } }),
      prisma.bundle.findMany({ where: { id: { in: bundleIds }, isActive: true, deletedAt: null }, include: { products: { include: { product: true } } } }),
    ])
    if (products.length !== productIds.length || bundles.length !== bundleIds.length) return NextResponse.json({ success: false, error: 'One or more products or bundles are unavailable' }, { status: 400 })

    const stockNeeded = new Map<string, { product: typeof products[number]; quantity: number }>()
    const addStock = (product: typeof products[number], quantity: number) => {
      const current = stockNeeded.get(product.id)
      stockNeeded.set(product.id, { product, quantity: (current?.quantity || 0) + quantity })
    }
    const orderItems: Array<{ productId?: string; bundleId?: string; name: string; price: number; quantity: number; image: string | null }> = []
    for (const line of productLines) {
      const product = products.find((item) => item.id === line.productId)!
      addStock(product, line.quantity)
      orderItems.push({ productId: product.id, name: product.name, price: product.price, quantity: line.quantity, image: firstImage(product.images) })
    }
    for (const line of bundleLines) {
      const bundle = bundles.find((item) => item.id === line.bundleId)!
      const facts = calculateBundleFacts(bundle.bundlePrice, bundle.products)
      if (!facts.isInStock || facts.maxQuantity < line.quantity) return NextResponse.json({ success: false, error: `Insufficient stock for ${bundle.name}` }, { status: 400 })
      for (const item of bundle.products) addStock(item.product, item.quantity * line.quantity)
      const image = bundle.coverImageUrl || (bundle.coverImage ? `https://res.cloudinary.com/dohoc0tmp/image/upload/${bundle.coverImage}` : firstImage(bundle.products[0]?.product.images || '[]'))
      orderItems.push({ bundleId: bundle.id, name: bundle.name, price: bundle.bundlePrice, quantity: line.quantity, image })
    }
    for (const needed of stockNeeded.values()) if (needed.product.stock < needed.quantity) return NextResponse.json({ success: false, error: `Insufficient stock for ${needed.product.name}` }, { status: 400 })

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const user = await requireAuth().catch(() => null)
    let discountAmount = 0
    let couponId: string | null = null
    let freeShipping = false
    if (input.couponCode) {
      const code = input.couponCode.toUpperCase().trim()
      const coupon = await prisma.coupon.findFirst({ where: { code, isActive: true } })
      if (!coupon) return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 400 })
      const now = new Date()
      const validWindow = coupon.startsAt <= now && (!coupon.endsAt || coupon.endsAt >= now)
      const usageAvailable = coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit
      const minimumMet = coupon.minOrderAmount === null || subtotal >= coupon.minOrderAmount
      const customerUses = await prisma.order.count({ where: { couponId: coupon.id, customerPhone: input.customerPhone, status: { not: 'CANCELLED' } } })
      const selectedProductIds = parseIds(coupon.productIds)
      const selectedCategoryIds = parseIds(coupon.categoryIds)
      const eligibleSubtotal = productLines.reduce((sum, line) => {
        const product = products.find((item) => item.id === line.productId)!
        const eligible = coupon.appliesToAllProducts || selectedProductIds.includes(product.id) || selectedCategoryIds.includes(product.categoryId)
        return eligible ? sum + product.price * line.quantity : sum
      }, 0)
      if (!validWindow || !usageAvailable || !minimumMet || customerUses >= coupon.usageLimitPerUser || eligibleSubtotal <= 0) return NextResponse.json({ success: false, error: 'Coupon is expired, unavailable, already used, or does not apply to these items' }, { status: 400 })
      couponId = coupon.id
      discountAmount = coupon.type === 'PERCENTAGE' ? Math.round(eligibleSubtotal * coupon.value / 100) : coupon.type === 'FIXED' ? Math.min(coupon.value, eligibleSubtotal) : 0
      if (coupon.maxDiscountAmount !== null) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
      freeShipping = coupon.type === 'FREE_SHIPPING'
    }
    const calculatedDelivery = calculateDelivery(input.district, subtotal - discountAmount)
    const delivery = freeShipping ? { ...calculatedDelivery, fee: 0, feeFormatted: 'FREE', isFreeDelivery: true } : calculatedDelivery
    const total = Math.max(0, subtotal - discountAmount + delivery.fee)
    const orderNumber = `FCS-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`
    const estimatedArrival = new Date(Date.now() + (delivery.isSameDay ? 1 : 4) * 86400000)

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({ data: { orderNumber, customerName: input.customerName, customerPhone: input.customerPhone, customerEmail: input.customerEmail || null, userId: user?.id || null, address: input.address, city: input.sector, district: input.district, sector: input.sector, province, notes: input.notes || null, subtotal, discountAmount, deliveryFee: delivery.fee, total, couponId, loyaltyPointsEarned: Math.floor(total / 1000), status: input.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING', items: { create: orderItems } }, include: { items: true } })
      await tx.payment.create({ data: { orderId: created.id, method: input.paymentMethod, amount: total, status: 'PENDING', phoneNumber: input.paymentMethod.includes('MONEY') || input.paymentMethod === 'MTN_MOMO' ? input.customerPhone : null } })
      await tx.delivery.create({ data: { orderId: created.id, status: 'PENDING', estimatedArrival } })
      if (input.paymentMethod === 'COD') {
        for (const needed of stockNeeded.values()) {
          const updated = await tx.product.updateMany({ where: { id: needed.product.id, stock: { gte: needed.quantity } }, data: { stock: { decrement: needed.quantity } } })
          if (updated.count !== 1) throw new Error(`Insufficient stock for ${needed.product.name}`)
        }
        for (const line of bundleLines) await tx.bundle.update({ where: { id: line.bundleId }, data: { totalSales: { increment: line.quantity } } })
      }
      if (couponId) await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } })
      return created
    })
    const confirmationDelivery = input.paymentMethod === 'COD'
      ? await sendOrderConfirmation({ orderId: order.id, orderNumber: order.orderNumber, customerName: order.customerName, customerPhone: order.customerPhone, customerEmail: order.customerEmail, totalAmount: order.total, deliveryDistrict: order.district || order.city, estimatedDelivery: estimatedArrival, paymentMethod: input.paymentMethod, language: input.language, paymentConfirmed: false }).catch(() => ({ sms: 'failed' as const, email: 'failed' as const }))
      : { sms: 'not_requested' as const, email: 'not_requested' as const }
    return NextResponse.json({ success: true, data: { order, confirmationDelivery }, order, confirmationDelivery }, { status: 201 })
  } catch (error) {
    console.error('Order create API error:', error)
    const message = error instanceof Error && error.message.startsWith('Insufficient stock') ? error.message : 'Failed to create order'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
function firstImage(value: string) { try { const images = JSON.parse(value); return Array.isArray(images) ? images[0] || null : null } catch { return null } }
function parseIds(value: string | null) { try { const ids = JSON.parse(value || '[]'); return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [] } catch { return [] } }
