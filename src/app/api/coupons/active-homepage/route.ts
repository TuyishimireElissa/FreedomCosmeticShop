import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const candidates = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    const coupon = candidates.find((item) => item.usageLimit === null || item.usedCount < item.usageLimit)

    if (!coupon) {
      return NextResponse.json(
        { success: true, data: null },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          code: coupon.code,
          discountType: coupon.type,
          discountValue: coupon.value,
          minimumOrder: coupon.minOrderAmount,
          maximumDiscount: coupon.maxDiscountAmount,
          usageLimitPerUser: coupon.usageLimitPerUser,
          validUntil: coupon.endsAt,
          appliesToAllProducts: coupon.appliesToAllProducts,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Active homepage coupon API error:', error)
    return NextResponse.json({ success: false, data: null }, { status: 500 })
  }
}
