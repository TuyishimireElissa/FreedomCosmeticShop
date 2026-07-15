export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { previewCoupon } from '@/lib/coupon-preview'

const schema = z.object({
  code: z.string().trim().min(1).max(50),
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(99),
  })).max(100),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 })

    const user = await requireAuth()
    const items = parsed.data.items.map((item) => ({ productId: item.productId!, quantity: item.quantity! }))
    const preview = await previewCoupon(parsed.data.code, items, user?.id)
    if (!preview) return NextResponse.json({ success: false, error: 'COUPON_NOT_FOUND' }, { status: 404 })

    return NextResponse.json({ success: true, data: preview, ...preview })
  } catch (error) {
    console.error('Coupon preview error:', error)
    return NextResponse.json({ success: false, error: 'COUPON_PREVIEW_FAILED' }, { status: 500 })
  }
}
