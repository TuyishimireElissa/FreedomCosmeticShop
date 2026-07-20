export const dynamic = 'force-dynamic'

/**
 * Durable, consent-gated abandoned-cart reminder marker.
 * Cart totals and identity are read from the authenticated database cart;
 * callers cannot submit contact information, user IDs, item counts, or value.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/permissions'
import { clearCartTracking } from '@/server/services/sms-scheduler'
import { hasCurrentRetentionConsent, syncAbandonedCartReminder } from '@/server/services/retention-messaging'

const input = z.object({ clear: z.boolean().optional() }).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const limit = rateLimit(`abandoned-cart:${user.id}`, { maxActions: 60, windowMs: 60 * 60_000 })
  if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

  const parsed = input.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400, headers })
  if (parsed.data.clear) {
    const now = new Date()
    await db.abandonedCartReminder.updateMany({
      where: { userId: user.id, status: { notIn: ['SENT', 'CANCELLED'] } },
      data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: 'CART_CLEARED' },
    })
    clearCartTracking(user.id)
    return NextResponse.json({ success: true }, { headers })
  }

  const [preference, cart] = await Promise.all([
    db.communicationPreference.findUnique({ where: { userId: user.id } }),
    db.cart.findUnique({ where: { userId: user.id }, select: { id: true, totalItems: true, updatedAt: true } }),
  ])
  if (!hasCurrentRetentionConsent(preference, 'SMS', 'ABANDONED_CART')) {
    return NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 409, headers })
  }
  if (!cart || cart.totalItems <= 0) return NextResponse.json({ success: true, reminder: null }, { status: 202, headers })
  const reminder = await syncAbandonedCartReminder(user.id, cart)
  return NextResponse.json({ success: true, reminder: reminder ? { id: reminder.id, status: reminder.status, dueAt: reminder.dueAt } : null }, { status: 202, headers })
}
