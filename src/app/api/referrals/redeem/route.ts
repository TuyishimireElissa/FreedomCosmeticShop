export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'
import { redeemReferralCode, RetentionRewardError } from '@/server/services/retention-rewards'

const input = z.object({ code: z.string().trim().min(1).max(40) }).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  }
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })

  const limit = rateLimit(`referral-redeem:${user.id}`, { maxActions: 10, windowMs: 60 * 60_000 })
  if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_CODE' }, { status: 400, headers })

  try {
    const result = await redeemReferralCode(user.id, parsed.data.code)
    return NextResponse.json({ success: true, ...result }, { headers })
  } catch (error) {
    if (error instanceof RetentionRewardError) {
      const status = error.code === 'INVALID_CODE' ? 404 : error.code === 'SELF_REFERRAL' ? 400 : 409
      return NextResponse.json({ error: error.code }, { status, headers })
    }
    console.error('Referral redemption failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'REFERRAL_UNAVAILABLE' }, { status: 503, headers })
  }
}
