import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({ code: z.string().trim().min(1).max(50), subtotal: z.number().min(0) })

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Valid code and subtotal are required', valid: false }, { status: 400 })
    const code = parsed.data.code.toUpperCase()
    const subtotal = parsed.data.subtotal
    const coupon = await prisma.coupon.findUnique({ where: { code } })
    if (!coupon || !coupon.isActive) return NextResponse.json({ success: false, error: 'Invalid coupon code', valid: false }, { status: 404 })
    const now = new Date()
    if (coupon.startsAt > now) return NextResponse.json({ success: false, error: 'Coupon is not active yet', valid: false }, { status: 400 })
    if (coupon.endsAt && coupon.endsAt < now) return NextResponse.json({ success: false, error: 'Coupon has expired', valid: false }, { status: 400 })
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ success: false, error: 'Coupon usage limit reached', valid: false }, { status: 400 })
    if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) return NextResponse.json({ success: false, error: `Minimum order is ${coupon.minOrderAmount.toLocaleString()} RWF`, valid: false }, { status: 400 })
    let discountAmount = coupon.type === 'PERCENTAGE' ? Math.round(subtotal * coupon.value / 100) : coupon.type === 'FIXED' ? Math.min(coupon.value, subtotal) : 0
    if (coupon.maxDiscountAmount !== null) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
    const data = {
      valid: true,
      coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description },
      discountAmount,
      freeShipping: coupon.type === 'FREE_SHIPPING',
      message: coupon.type === 'FREE_SHIPPING' ? 'Free shipping applied!' : 'Coupon applied!',
    }
    return NextResponse.json({ success: true, data, ...data })
  } catch (error) {
    console.error('Coupon API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to validate coupon', valid: false }, { status: 500 })
  }
}
