export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/permissions'
import { hasCurrentRetentionConsent } from '@/server/services/retention-messaging'

const input = z.object({
  productId: z.string().min(1).max(100),
  alertType: z.enum(['BACK_IN_STOCK', 'PRICE_DROP']),
  targetPrice: z.number().int().min(1).max(1_000_000_000).nullable().optional(),
  channel: z.literal('SMS'),
}).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const alerts = await db.stockAlert.findMany({
    where: { userId: user.id },
    select: { id: true, productId: true, alertType: true, targetPrice: true, channel: true, status: true, sentAt: true, cancelledAt: true, createdAt: true, product: { select: { name: true, slug: true, price: true, stock: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ alerts }, { headers })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const limit = rateLimit(`stock-alert:${user.id}`, { maxActions: 20, windowMs: 60 * 60_000 })
  if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_ALERT' }, { status: 400, headers })
  const data = parsed.data
  const [product, preference] = await Promise.all([
    db.product.findFirst({ where: { id: data.productId, isActive: true, isDeleted: false }, select: { id: true, price: true } }),
    db.communicationPreference.findUnique({ where: { userId: user.id } }),
  ])
  if (!product) return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404, headers })
  const purpose = data.alertType === 'PRICE_DROP' ? 'PRICE_DROP' : 'BACK_IN_STOCK'
  if (!hasCurrentRetentionConsent(preference, data.channel, purpose)) {
    return NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 409, headers })
  }
  if (data.alertType === 'PRICE_DROP' && (!data.targetPrice || data.targetPrice >= product.price)) {
    return NextResponse.json({ error: 'INVALID_TARGET_PRICE' }, { status: 400, headers })
  }

  const now = new Date()
  const alert = await db.stockAlert.upsert({
    where: { userId_productId_alertType: { userId: user.id, productId: product.id, alertType: data.alertType } },
    create: { userId: user.id, productId: product.id, alertType: data.alertType, targetPrice: data.alertType === 'PRICE_DROP' ? data.targetPrice : null, channel: data.channel, status: 'PENDING', consentGranted: true, consentCheckedAt: now },
    update: { targetPrice: data.alertType === 'PRICE_DROP' ? data.targetPrice : null, channel: data.channel, status: 'PENDING', sentAt: null, cancelledAt: null, lastErrorCode: null, consentGranted: true, consentCheckedAt: now },
    select: { id: true, productId: true, alertType: true, targetPrice: true, channel: true, status: true },
  })
  return NextResponse.json({ alert }, { status: 201, headers })
}
