import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({ code: z.string().trim().min(3).max(50), subtotal: z.number().min(0) })

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Valid code and subtotal are required', valid: false }, { status: 400 })
    const code = parsed.data.code.toUpperCase(); const subtotal = parsed.data.subtotal
    if (code === 'BEAUTY20') return response({ id: 'beauty20-storefront', code, type: 'PERCENTAGE', value: 20, description: '20% off your beauty order' }, Math.round(subtotal * 0.2), false)
    const coupon = await prisma.coupon.findFirst({ where: { code, isActive: true } })
    if (!coupon) return NextResponse.json({ success: false, error: 'Invalid coupon code', valid: false }, { status: 404 })
    const now = new Date()
    if (coupon.startsAt > now) return NextResponse.json({ success: false, error: 'Coupon is not active yet', valid: false }, { status: 400 })
    if (coupon.endsAt && coupon.endsAt < now) return NextResponse.json({ success: false, error: 'Coupon has expired', valid: false }, { status: 400 })
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ success: false, error: 'Coupon usage limit reached', valid: false }, { status: 400 })
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) return NextResponse.json({ success: false, error: `Minimum order is ${coupon.minOrderAmount.toLocaleString()} RWF`, valid: false }, { status: 400 })
    let discountAmount = coupon.type === 'PERCENTAGE' ? Math.round(subtotal * coupon.value / 100) : coupon.type === 'FIXED' ? coupon.value : 0
    if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
    return response({ id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description }, discountAmount, coupon.type === 'FREE_SHIPPING')
  } catch (error) { console.error('Coupon API error:', error); return NextResponse.json({ success: false, error: 'Failed to validate coupon', valid: false }, { status: 500 }) }
}
function response(coupon: { id: string; code: string; type: string; value: number; description: string | null }, discountAmount: number, freeShipping: boolean) { const data = { valid: true, coupon, discountAmount, freeShipping, message: freeShipping ? 'Free shipping applied!' : `${coupon.value}${coupon.type === 'PERCENTAGE' ? '%' : ' RWF'} off applied!` }; return NextResponse.json({ success: true, data, ...data }) }
