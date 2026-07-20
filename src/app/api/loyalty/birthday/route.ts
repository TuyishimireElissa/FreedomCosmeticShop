export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'
import { claimConfiguredBirthdayReward, RetentionRewardError } from '@/server/services/retention-rewards'

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  }
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })

  const limit = rateLimit(`birthday-claim:${user.id}`, { maxActions: 5, windowMs: 60 * 60_000 })
  if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

  try {
    const result = await claimConfiguredBirthdayReward(user.id)
    return NextResponse.json({ success: true, ...result }, { headers })
  } catch (error) {
    if (error instanceof RetentionRewardError) {
      return NextResponse.json({ error: error.code }, { status: 409, headers })
    }
    console.error('Birthday reward claim failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'LOYALTY_UNAVAILABLE' }, { status: 503, headers })
  }
}
