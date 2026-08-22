export const dynamic = 'force-dynamic'

/**
 * Mint a signed 7-day link for the father's mobile pricing page.
 *
 * Admin-only: only someone who can already update products may hand out a link
 * that updates products. The token itself carries no admin identity, so
 * possession of the link never escalates to admin access.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PERMISSIONS, rateLimit, requirePermission } from '@/lib/permissions'
import { QUICK_PRICE_TTL_DAYS, signQuickPriceToken } from '@/lib/quick-price-token'
import { logActivity } from '@/server/services/activity'

const LinkSchema = z.object({
  batch: z.number().int().min(1).max(999).optional().default(1),
}).strict()

export async function POST(request: Request) {
  try {
    const admin = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)

    const limit = rateLimit(`quick-price-link:${admin.id}`, { maxActions: 20, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many links generated. Wait a minute and try again.' },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = LinkSchema.safeParse(body ?? {})
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid batch' }, { status: 400 })
    }

    const token = await signQuickPriceToken({ batch: parsed.data.batch, issuedBy: admin.id })

    await logActivity({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: 'QUICK_PRICE_LINK_ISSUED',
      entityType: 'PRODUCT',
      description: `Issued a ${QUICK_PRICE_TTL_DAYS}-day pricing link for batch ${parsed.data.batch}`,
      severity: 'warn',
      req: request,
    }).catch(() => { /* logging must never block */ })

    return NextResponse.json({
      success: true,
      data: { token, expiresInDays: QUICK_PRICE_TTL_DAYS },
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode: number }).statusCode },
      )
    }
    console.error('Quick price link error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create link' }, { status: 500 })
  }
}
