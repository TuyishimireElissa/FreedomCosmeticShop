export const dynamic = 'force-dynamic'

/**
 * Price sync — the only endpoint that writes product prices.
 *
 * WHY A DEDICATED ROUTE
 *
 * The bulk content importer (src/lib/product-import.ts) deliberately whitelists
 * content fields only; price and stock are structurally impossible to write
 * through it. That is good design and I am not weakening it. Money gets its own
 * door, with its own validation and its own audit trail.
 *
 * TWO CALLERS, TWO AUTH MODES
 *
 *  - The admin dashboard, authenticated with PRODUCTS_UPDATE.
 *  - The father's mobile page, authenticated with a signed 7-day token that
 *    can do nothing except this.
 *
 * WHAT IT REFUSES
 *
 *  - Any price outside 1 .. 10,000,000 RWF.
 *  - wholesalePrice greater than price. The admin product schema already
 *    enforces this; repeating it here means the rule holds no matter which
 *    door the write comes through.
 *  - Writing to a product that already has a price, unless `overwrite` is
 *    explicitly true. The whole feature exists to fill blanks, and silently
 *    changing a price the owner already set would be the worst possible bug.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, rateLimit, requirePermission } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'
import { quickPriceTokenFromRequest, verifyQuickPriceToken } from '@/lib/quick-price-token'
import { MAX_PRICE_RWF, MIN_PRICE_RWF } from '@/lib/whatsapp-pricing'

const PriceRow = z.object({
  slug: z.string().trim().min(1).max(200),
  retail: z.number().int().min(MIN_PRICE_RWF).max(MAX_PRICE_RWF),
  wholesale: z.number().int().min(MIN_PRICE_RWF).max(MAX_PRICE_RWF).nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.wholesale != null && value.wholesale > value.retail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wholesale'],
      message: 'Wholesale price cannot exceed the retail price',
    })
  }
})

const PriceSyncSchema = z.object({
  prices: z.array(PriceRow).min(1).max(200),
  /** Off by default: this feature fills blanks, it does not revise real prices. */
  overwrite: z.boolean().optional().default(false),
}).strict()

interface SyncOutcome {
  slug: string
  status: 'updated' | 'skipped_has_price' | 'not_found'
  retail?: number
  wholesale?: number | null
  previousPrice?: number
}

export async function POST(request: Request) {
  try {
    // ─── Authenticate: admin session, or the father's signed link ─────────
    const token = quickPriceTokenFromRequest(request)
    const claims = await verifyQuickPriceToken(token)
    let actor = 'quick-price-link'
    let actorId = 'quick-price-link'
    let actorRole = 'QUICK_PRICE_TOKEN'

    if (!claims) {
      const admin = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
      actor = admin.name
      actorId = admin.id
      actorRole = admin.role
    }

    const limit = rateLimit(`price-sync:${actorId}`, { maxActions: 30, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many price updates. Wait a minute and try again.' },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = PriceSyncSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid price data', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { prices, overwrite } = parsed.data

    const results: SyncOutcome[] = []
    for (const row of prices) {
      const product = await prisma.product.findFirst({
        where: { slug: row.slug, isActive: true, isDeleted: false },
        select: { id: true, slug: true, name: true, price: true, wholesalePrice: true },
      })

      if (!product) {
        results.push({ slug: row.slug, status: 'not_found' })
        continue
      }

      // The guard that matters: never quietly change a price someone set.
      if (product.price > 0 && !overwrite) {
        results.push({ slug: row.slug, status: 'skipped_has_price', previousPrice: product.price })
        continue
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          price: row.retail,
          // Absent wholesale means "not answered", so the existing value is
          // left alone rather than cleared.
          ...(row.wholesale != null ? { wholesalePrice: row.wholesale } : {}),
        },
      })

      results.push({
        slug: row.slug,
        status: 'updated',
        retail: row.retail,
        wholesale: row.wholesale ?? null,
        previousPrice: product.price,
      })
    }

    const updated = results.filter((entry) => entry.status === 'updated')

    await logActivity({
      userId: actorId,
      userName: actor,
      userRole: actorRole,
      action: 'PRODUCT_PRICES_SYNCED',
      entityType: 'PRODUCT',
      description: `Set prices on ${updated.length} product(s) via ${claims ? `quick-price link (batch ${claims.batch})` : 'admin dashboard'}`,
      severity: 'warn',
      req: request,
    }).catch(() => { /* logging must never block the write */ })

    return NextResponse.json({
      success: true,
      data: {
        updated: updated.length,
        skipped: results.filter((entry) => entry.status === 'skipped_has_price').length,
        notFound: results.filter((entry) => entry.status === 'not_found').length,
        results,
      },
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode: number }).statusCode },
      )
    }
    console.error('Price sync error:', error)
    return NextResponse.json({ success: false, error: 'Failed to sync prices' }, { status: 500 })
  }
}
