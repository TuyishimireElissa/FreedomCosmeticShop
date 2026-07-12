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
    let discountAmount = 0; let couponId: string | null = null
    if (input.couponCode?.toUpperCase() === 'BEAUTY20') discountAmount = Math.round(subtotal * 0.2)
    else if (input.couponCode) {
      const coupon = await prisma.coupon.findFirst({ where: { code: input.couponCode.toUpperCase(), isActive: true } })
      if (coupon && (!coupon.startsAt || coupon.startsAt <= new Date()) && (!coupon.endsAt || coupon.endsAt >= new Date()) && (!coupon.minOrderAmount || subtotal >= coupon.minOrderAmount)) { couponId = coupon.id; discountAmount = coupon.type === 'PERCENTAGE' ? Math.round(subtotal * coupon.value / 100) : coupon.type === 'FIXED' ? coupon.value : 0 }
    }
    const delivery = calculateDelivery(input.district, subtotal - discountAmount)
    const total = Math.max(0, subtotal - discountAmount + delivery.fee)
    const user = await requireAuth().catch(() => null)
    const orderNumber = `FCS-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({ data: { orderNumber, customerName: input.customerName, customerPhone: input.customerPhone, customerEmail: input.customerEmail || null, userId: user?.id || null, address: input.address, city: input.sector, district: input.district, sector: input.sector, province, notes: input.notes || null, subtotal, discountAmount, deliveryFee: delivery.fee, total, couponId, loyaltyPointsEarned: Math.floor(total / 1000), items: { create: orderItems } }, include: { items: true } })
      await tx.payment.create({ data: { orderId: created.id, method: input.paymentMethod, amount: total, status: 'PENDING', phoneNumber: input.paymentMethod.includes('MONEY') || input.paymentMethod === 'MTN_MOMO' ? input.customerPhone : null } })
      await tx.delivery.create({ data: { orderId: created.id, status: 'PENDING', estimatedArrival: new Date(Date.now() + (delivery.isSameDay ? 1 : 4) * 86400000) } })
      for (const item of orderItems) await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
      if (couponId) await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } })
      return created
    })
    return NextResponse.json({ success: true, data: { order }, order }, { status: 201 })
  } catch (error) { console.error('Order create API error:', error); const message = error instanceof Error && error.message.startsWith('Insufficient stock') ? error.message : 'Failed to create order'; return NextResponse.json({ success: false, error: message }, { status: 500 }) }
}
function firstImage(value: string) { try { const images = JSON.parse(value); return Array.isArray(images) ? images[0] || null : null } catch { return null } }
