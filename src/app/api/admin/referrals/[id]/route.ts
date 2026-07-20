export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

const nullableDate = z.union([z.string().datetime(), z.null()]).optional()
const input = z.object({
  isActive: z.boolean().optional(),
  pointsPerUse: z.number().int().min(1).max(1_000_000).nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).nullable().optional(),
  discountValue: z.number().int().min(1).max(1_000_000_000).nullable().optional(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  startsAt: nullableDate,
  endsAt: nullableDate,
}).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
    }
    await requirePermission(PERMISSIONS.COUPONS_UPDATE)
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_POLICY' }, { status: 400, headers })

    const { id } = await params
    const current = await db.referralCode.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers })

    const next = {
      pointsPerUse: parsed.data.pointsPerUse === undefined ? current.pointsPerUse : parsed.data.pointsPerUse,
      discountType: parsed.data.discountType === undefined ? current.discountType : parsed.data.discountType,
      discountValue: parsed.data.discountValue === undefined ? current.discountValue : parsed.data.discountValue,
      maxUses: parsed.data.maxUses === undefined ? current.maxUses : parsed.data.maxUses,
      startsAt: parsed.data.startsAt === undefined ? current.startsAt : parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt === undefined ? current.endsAt : parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    }
    const discountPaired = Boolean(next.discountType) === Boolean(next.discountValue)
    const percentageValid = next.discountType !== 'PERCENTAGE' || (next.discountValue !== null && next.discountValue <= 100)
    const datesValid = !next.startsAt || !next.endsAt || next.startsAt < next.endsAt
    const usesValid = next.maxUses === null || next.maxUses >= current.usedCount
    const hasConfiguredBenefit = Boolean((next.pointsPerUse && next.pointsPerUse > 0) || (next.discountType && next.discountValue && next.discountValue > 0))
    if (!discountPaired || !percentageValid || !datesValid || !usesValid || (parsed.data.isActive === true && !hasConfiguredBenefit)) {
      return NextResponse.json({ error: 'INVALID_POLICY' }, { status: 400, headers })
    }

    const policyChanged = Object.keys(parsed.data).some((key) => key !== 'isActive')
    const referral = await db.referralCode.update({
      where: { id },
      data: {
        ...next,
        isActive: parsed.data.isActive ?? current.isActive,
        policyConfiguredAt: policyChanged || (parsed.data.isActive === true && !current.policyConfiguredAt)
          ? new Date()
          : current.policyConfiguredAt,
      },
      select: { id: true, code: true, isActive: true, pointsPerUse: true, discountType: true, discountValue: true, maxUses: true, usedCount: true, startsAt: true, endsAt: true, policyConfiguredAt: true },
    })
    return NextResponse.json({ referral }, { headers })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode, headers })
    console.error('Referral policy update failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'REFERRAL_UNAVAILABLE' }, { status: 503, headers })
  }
}
