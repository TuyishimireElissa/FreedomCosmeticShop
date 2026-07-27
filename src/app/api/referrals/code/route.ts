export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/permissions'
import { getOrCreateReferralCode } from '@/server/services/retention-rewards'

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

function invalidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  return Boolean(origin && origin !== new URL(request.url).origin)
}

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })

  const referral = await db.referralCode.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      code: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      maxUses: true,
      usedCount: true,
      policyConfiguredAt: true,
    },
  })
  return NextResponse.json({ referral }, { headers })
}

export async function POST(request: NextRequest) {
  if (invalidOrigin(request)) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })

  const limit = rateLimit(`referral-code:${user.id}`, { maxActions: 5, windowMs: 60_000 })
  if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

  try {
    const referral = await getOrCreateReferralCode(user.id)
    return NextResponse.json({
      referral: {
        id: referral.id,
        code: referral.code,
        isActive: referral.isActive,
        policyConfigured: Boolean(referral.policyConfiguredAt),
      },
    }, { status: 201, headers })
  } catch (error) {
    console.error('Referral code creation failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'REFERRAL_UNAVAILABLE' }, { status: 503, headers })
  }
}
