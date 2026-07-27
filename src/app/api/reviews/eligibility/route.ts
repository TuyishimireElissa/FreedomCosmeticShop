export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { REVIEW_WINDOW_DAYS } from '@/lib/review-constants'

const schema = z.object({ orderId: z.string().min(1).max(100), productId: z.string().min(1).max(100) })

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 })
    const url = new URL(request.url)
    const parsed = schema.safeParse({ orderId: url.searchParams.get('orderId'), productId: url.searchParams.get('productId') })
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 })
    const { orderId, productId } = parsed.data
    const [order, product, existing] = await Promise.all([
      prisma.order.findFirst({ where: { id: orderId, userId: user.id }, include: { delivery: { select: { status: true, deliveredAt: true } }, items: { select: { productId: true, bundle: { select: { products: { select: { productId: true } } } } } } } }),
      prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, slug: true, images: true, shades: true, shade: true, skinType: true, hairType: true, category: { select: { slug: true } }, productImages: { select: { url: true, publicId: true, altText: true, isPrimary: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } } } }),
      prisma.review.findFirst({ where: { orderId, productId, userId: user.id }, select: { id: true } }),
    ])
    if (!order || order.status !== 'DELIVERED' || order.delivery?.status !== 'DELIVERED' || !order.delivery.deliveredAt) return NextResponse.json({ success: false, error: 'DELIVERED_ORDER_REQUIRED' }, { status: 403 })
    const purchased = order.items.some((item) => item.productId === productId || item.bundle?.products.some((component) => component.productId === productId))
    if (!purchased || !product) return NextResponse.json({ success: false, error: 'PRODUCT_NOT_IN_ORDER' }, { status: 403 })
    if (existing) return NextResponse.json({ success: false, error: 'ALREADY_REVIEWED' }, { status: 409 })
    const reviewDeadline = new Date(order.delivery.deliveredAt.getTime() + REVIEW_WINDOW_DAYS * 86_400_000)
    if (new Date() > reviewDeadline) return NextResponse.json({ success: false, error: 'REVIEW_WINDOW_EXPIRED' }, { status: 400 })
    const structured = product.productImages.find((image) => image.isPrimary) || product.productImages[0]
    return NextResponse.json({ success: true, data: {
      order: { id: order.id, orderNumber: order.orderNumber, deliveredAt: order.delivery.deliveredAt, reviewDeadline },
      product: { id: product.id, name: product.name, slug: product.slug, image: structured?.url || parseImages(product.images)[0] || null, categorySlug: product.category.slug, hasShades: parseArray(product.shades).length > 0 || Boolean(product.shade), supportsSkinType: parseArray(product.skinType).length > 0 || ['skincare','body-care'].includes(product.category.slug), supportsHairType: Boolean(product.hairType) || ['haircare','hair-care'].includes(product.category.slug) },
    } })
  } catch (error) {
    console.error('Review eligibility failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'ELIGIBILITY_UNAVAILABLE' }, { status: 503 })
  }
}
function parseArray(value: string | null) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
const parseImages = parseArray
