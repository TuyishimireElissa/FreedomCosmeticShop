export const dynamic = 'force-dynamic'

import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAllDistricts } from '@/lib/rwanda-locations'
import { rateLimit } from '@/lib/permissions'

const eventTypes = ['order_product','order_cart','product_inquiry','delivery_inquiry','payment_help','returns_inquiry','authenticity_check','general_support','track_order','wholesale_inquiry','share_product','share_cart'] as const
const schema = z.object({
  eventType: z.enum(eventTypes),
  productId: z.string().min(1).max(100).optional(),
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional(),
  cartTotal: z.number().int().min(0).max(1_000_000_000).optional(),
  district: z.string().max(80).optional(),
  language: z.enum(['rw', 'en']).default('rw'),
  pagePath: z.string().regex(/^\/(?!\/)[^?#]*$/).max(300).optional(),
}).strict()

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin) return NextResponse.json({ success: false, error: 'INVALID_ORIGIN' }, { status: 403 })
    const fingerprint = createHash('sha256').update(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').digest('hex').slice(0, 24)
    const limit = rateLimit(`wa-analytics:${fingerprint}`, { maxActions: 60, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429 })

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_EVENT' }, { status: 400 })
    const data = parsed.data
    if (data.district && !getAllDistricts().includes(data.district)) return NextResponse.json({ success: false, error: 'INVALID_DISTRICT' }, { status: 400 })
    if ((data.productId && !data.productSlug) || (!data.productId && data.productSlug)) return NextResponse.json({ success: false, error: 'INCOMPLETE_PRODUCT_REFERENCE' }, { status: 400 })
    if (data.productId && data.productSlug) {
      const product = await prisma.product.findFirst({ where: { id: data.productId, slug: data.productSlug, isDeleted: false }, select: { id: true } })
      if (!product) return NextResponse.json({ success: false, error: 'INVALID_PRODUCT' }, { status: 400 })
    }

    await prisma.whatsAppClick.create({ data: {
      eventType: data.eventType,
      productId: data.productId || null,
      productSlug: data.productSlug || null,
      cartTotal: data.cartTotal ?? null,
      district: data.district || null,
      language: data.language,
      pagePath: data.pagePath || null,
    } })
    return NextResponse.json({ success: true }, { status: 202 })
  } catch (error) {
    console.error('WhatsApp analytics write failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'ANALYTICS_UNAVAILABLE' }, { status: 503 })
  }
}
