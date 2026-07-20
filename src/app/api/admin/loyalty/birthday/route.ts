export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

const input = z.object({
  userId: z.string().min(1).max(100),
  birthMonth: z.number().int().min(1).max(12),
  birthDay: z.number().int().min(1).max(31),
  rewardYear: z.number().int().min(2020).max(2200),
  rewardPoints: z.number().int().min(1).max(1_000_000),
  expiresAt: z.string().datetime().nullable().optional(),
}).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

function validMonthDay(month: number, day: number): boolean {
  const candidate = new Date(Date.UTC(2000, month - 1, day))
  return candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
    }
    await requirePermission(PERMISSIONS.CUSTOMERS_UPDATE)
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_REWARD' }, { status: 400, headers })
    }
    const data = parsed.data
    if (!validMonthDay(data.birthMonth, data.birthDay)) {
      return NextResponse.json({ error: 'INVALID_REWARD' }, { status: 400, headers })
    }
    const user = await db.user.findFirst({ where: { id: data.userId, isDeleted: false }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404, headers })

    const existing = await db.birthdayReward.findUnique({
      where: { userId_rewardYear: { userId: data.userId, rewardYear: data.rewardYear } },
      select: { status: true },
    })
    if (existing?.status === 'REDEEMED') {
      return NextResponse.json({ error: 'REWARD_ALREADY_REDEEMED' }, { status: 409, headers })
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
    const reward = await db.birthdayReward.upsert({
      where: { userId_rewardYear: { userId: data.userId, rewardYear: data.rewardYear } },
      create: {
        userId: data.userId,
        birthMonth: data.birthMonth,
        birthDay: data.birthDay,
        rewardYear: data.rewardYear,
        rewardPoints: data.rewardPoints,
        expiresAt,
        status: 'READY',
        consentGranted: false,
        consentCheckedAt: null,
      },
      update: { birthMonth: data.birthMonth, birthDay: data.birthDay, rewardPoints: data.rewardPoints, expiresAt, status: 'READY', revokedAt: null, consentGranted: false, consentCheckedAt: null },
      select: { id: true, userId: true, birthMonth: true, birthDay: true, rewardYear: true, rewardPoints: true, status: true, expiresAt: true },
    })
    return NextResponse.json({ reward }, { status: 201, headers })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode, headers })
    console.error('Birthday reward configuration failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'LOYALTY_UNAVAILABLE' }, { status: 503, headers })
  }
}
