export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/permissions'
import { hasCurrentRetentionConsent } from '@/server/services/retention-messaging'

const input = z.object({
  productId: z.string().min(1).max(100),
  sourceOrderId: z.string().min(1).max(100),
  dueAt: z.string().datetime(),
  channel: z.literal('SMS'),
}).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const reminders = await db.reorderReminder.findMany({
    where: { userId: user.id },
    select: { id: true, productId: true, sourceOrderId: true, estimatedDays: true, dueAt: true, channel: true, status: true, sentAt: true, cancelledAt: true, createdAt: true, product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ reminders }, { headers })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const limit = rateLimit(`reorder-reminder:${user.id}`, { maxActions: 20, windowMs: 60 * 60_000 })
  if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_REMINDER' }, { status: 400, headers })
  const data = parsed.data
  const now = new Date()
  const dueAt = new Date(data.dueAt)
  const maximum = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000)
  if (dueAt <= now || dueAt > maximum) return NextResponse.json({ error: 'INVALID_DUE_DATE' }, { status: 400, headers })

  const [order, preference] = await Promise.all([
    db.order.findFirst({
      where: { id: data.sourceOrderId, userId: user.id, status: 'DELIVERED', items: { some: { productId: data.productId } } },
      select: { id: true },
    }),
    db.communicationPreference.findUnique({ where: { userId: user.id } }),
  ])
  if (!order) return NextResponse.json({ error: 'DELIVERED_PURCHASE_REQUIRED' }, { status: 409, headers })
  if (!hasCurrentRetentionConsent(preference, data.channel, 'REORDER')) {
    return NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 409, headers })
  }

  const existing = await db.reorderReminder.findFirst({
    where: { userId: user.id, productId: data.productId, sourceOrderId: order.id, status: 'PENDING' },
    select: { id: true },
  })
  const estimatedDays = Math.ceil((dueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  const reminder = existing
    ? await db.reorderReminder.update({ where: { id: existing.id }, data: { dueAt, estimatedDays, channel: data.channel, consentGranted: true, consentCheckedAt: now }, select: { id: true, productId: true, sourceOrderId: true, dueAt: true, estimatedDays: true, channel: true, status: true } })
    : await db.reorderReminder.create({ data: { userId: user.id, productId: data.productId, sourceOrderId: order.id, dueAt, estimatedDays, channel: data.channel, status: 'PENDING', consentGranted: true, consentCheckedAt: now }, select: { id: true, productId: true, sourceOrderId: true, dueAt: true, estimatedDays: true, channel: true, status: true } })
  return NextResponse.json({ reminder }, { status: 201, headers })
}
