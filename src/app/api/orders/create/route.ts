export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateDelivery, getAllDistricts, getProvinceByDistrict } from '@/server/services/delivery.service'

const schema = z.object({
  customerName: z.string().trim().min(2).max(100), customerPhone: z.string().regex(/^(?:\+250|250|0)?7[2389]\d{7}$/), customerEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().trim().min(5).max(300), district: z.string(), sector: z.string().trim().min(2).max(100), notes: z.string().max(500).optional(), paymentMethod: z.enum(['MTN_MOMO','AIRTEL_MONEY','CARD','COD']), couponCode: z.string().max(50).optional(), items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99) })).min(1),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid order data', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    const input = parsed.data
    if (!getAllDistricts().includes(input.district)) return NextResponse.json({ success: false, error: 'Invalid Rwanda district' }, { status: 400 })
    const province = getProvinceByDistrict(input.district)
    if (input.paymentMethod === 'COD' && province !== 'Kigali City') return NextResponse.json({ success: false, error: 'Cash on Delivery is available in Kigali only' }, { status: 400 })

    const ids = [...new Set(input.items.map((item) => item.productId))]
    const products = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true, isDeleted: false } })
    if (products.length !== ids.length) return NextResponse.json({ success: false, error: 'One or more products are unavailable' }, { status: 400 })
    const orderItems = input.items.map((item) => { const product = products.find((value) => value.id === item.productId)!; if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`); return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity, image: firstImage(product.images) } })
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const user = await requireAuth().catch(() => null)
    let discountAmount = 0
    let couponId: string | null = null
    let freeShipping = false
    if (input.couponCode) {
      const code = input.couponCode.toUpperCase().trim()
      const coupon = await prisma.coupon.findFirst({ where: { code, isActive: true } })
      if (!coupon) {
        if (code !== 'BEAUTY20') return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 400 })
        discountAmount = Math.round(subtotal * 0.2)
      } else {
        const now = new Date()
        const validWindow = coupon.startsAt <= now && (!coupon.endsAt || coupon.endsAt >= now)
        const usageAvailable = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
        const minimumMet = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount
        const customerUses = await prisma.order.count({
          where: { couponId: coupon.id, customerPhone: input.customerPhone, status: { not: 'CANCELLED' } },
        })
        if (!validWindow || !usageAvailable || !minimumMet || customerUses >= coupon.usageLimitPerUser) {
          return NextResponse.json({ success: false, error: 'Coupon is expired, unavailable, or already used' }, { status: 400 })
        }
        couponId = coupon.id
        discountAmount = coupon.type === 'PERCENTAGE'
          ? Math.round(subtotal * coupon.value / 100)
          : coupon.type === 'FIXED' ? coupon.value : 0
        if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
        freeShipping = coupon.type === 'FREE_SHIPPING'
      }
    }
    const calculatedDelivery = calculateDelivery(input.district, subtotal - discountAmount)
    const delivery = freeShipping ? { ...calculatedDelivery, fee: 0, feeFormatted: 'FREE', isFreeDelivery: true } : calculatedDelivery
    const total = Math.max(0, subtotal - discountAmount + delivery.fee)
    const orderNumber = `FCS-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({ data: { orderNumber, customerName: input.customerName, customerPhone: input.customerPhone, customerEmail: input.customerEmail || null, userId: user?.id || null, address: input.address, city: input.sector, district: input.district, sector: input.sector, province, notes: input.notes || null, subtotal, discountAmount, deliveryFee: delivery.fee, total, couponId, loyaltyPointsEarned: Math.floor(total / 1000), status: input.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING', items: { create: orderItems } }, include: { items: true } })
      await tx.payment.create({ data: { orderId: created.id, method: input.paymentMethod, amount: total, status: 'PENDING', phoneNumber: input.paymentMethod.includes('MONEY') || input.paymentMethod === 'MTN_MOMO' ? input.customerPhone : null } })
      await tx.delivery.create({ data: { orderId: created.id, status: 'PENDING', estimatedArrival: new Date(Date.now() + (delivery.isSameDay ? 1 : 4) * 86400000) } })
      // Prepaid inventory is deducted only after a verified payment webhook.
      // Cash-on-delivery orders are confirmed immediately and deduct here.
      if (input.paymentMethod === 'COD') {
        for (const item of orderItems) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          })
          if (updated.count !== 1) throw new Error(`Insufficient stock for ${item.name}`)
        }
      }
      if (couponId) await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } })
      return created
    })
    return NextResponse.json({ success: true, data: { order }, order }, { status: 201 })
  } catch (error) { console.error('Order create API error:', error); const message = error instanceof Error && error.message.startsWith('Insufficient stock') ? error.message : 'Failed to create order'; return NextResponse.json({ success: false, error: message }, { status: 500 }) }
}
function firstImage(value: string) { try { const images = JSON.parse(value); return Array.isArray(images) ? images[0] || null : null } catch { return null } }
