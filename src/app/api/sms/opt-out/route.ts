export const dynamic = 'force-dynamic'

/**
 * Durable promotional/retention SMS opt-out.
 * POST remains available without login so a recipient can stop messages using
 * their own phone number. Opt-in and status checks require authentication.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { normalizeRwandaPhone } from '@/lib/phone'
import { clearCartTracking } from '@/server/services/sms-scheduler'
import { optIn, optOut } from '@/server/services/sms'

const phoneInput = z.object({ phone: z.string().min(9).max(20) }).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

function invalidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  return Boolean(origin && origin !== new URL(request.url).origin)
}

export async function POST(request: NextRequest) {
  if (invalidOrigin(request)) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  const parsed = phoneInput.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400, headers })

  let normalized: string
  try {
    normalized = normalizeRwandaPhone(parsed.data.phone)
  } catch {
    return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400, headers })
  }
  optOut(normalized)

  const local = normalized.replace(/^\+250/, '0')
  const user = await db.user.findFirst({
    where: { phone: { in: [...new Set([parsed.data.phone, normalized, local])] }, isDeleted: false },
    select: { id: true },
  })
  if (user) {
    const now = new Date()
    await db.$transaction([
      db.communicationPreference.upsert({
        where: { userId: user.id },
        create: { userId: user.id, smsEnabled: false, smsRevokedAt: now },
        update: { smsEnabled: false, smsRevokedAt: now },
      }),
      db.stockAlert.updateMany({
        where: { userId: user.id, channel: 'SMS', status: { in: ['PENDING', 'BLOCKED', 'FAILED'] } },
        data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: 'SMS_OPT_OUT' },
      }),
      db.reorderReminder.updateMany({
        where: { userId: user.id, channel: 'SMS', status: { in: ['PENDING', 'BLOCKED', 'FAILED'] } },
        data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: 'SMS_OPT_OUT' },
      }),
      db.abandonedCartReminder.updateMany({
        where: { userId: user.id, channel: 'SMS', status: { in: ['PENDING', 'BLOCKED', 'FAILED'] } },
        data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: 'SMS_OPT_OUT' },
      }),
    ])
    clearCartTracking(user.id)
  }
  return NextResponse.json({ success: true }, { headers })
}

export async function DELETE(request: NextRequest) {
  if (invalidOrigin(request)) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const now = new Date()
  await db.communicationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, smsEnabled: true, smsConsentedAt: now, smsRevokedAt: null },
    update: { smsEnabled: true, smsConsentedAt: now, smsRevokedAt: null },
  })
  optIn(user.phone)
  return NextResponse.json({ success: true }, { headers })
}

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const preference = await db.communicationPreference.findUnique({
    where: { userId: user.id },
    select: { smsEnabled: true, smsConsentedAt: true, smsRevokedAt: true },
  })
  const optedOut = !preference?.smsEnabled || Boolean(preference.smsRevokedAt && (!preference.smsConsentedAt || preference.smsRevokedAt >= preference.smsConsentedAt))
  return NextResponse.json({ optedOut }, { headers })
}
