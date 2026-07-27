export const dynamic = 'force-dynamic'

import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

const querySchema = z.object({ filter: z.enum(['all','reported','needs_response','hidden']).default('all'), page: z.coerce.number().int().min(1).max(10_000).default(1) })
const LIMIT = 25

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.REVIEWS_MODERATE)
    const url = new URL(request.url)
    const parsed = querySchema.safeParse({ filter: url.searchParams.get('filter') || undefined, page: url.searchParams.get('page') || undefined })
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_QUERY' }, { status: 400 })
    const { filter, page } = parsed.data
    const where: Prisma.ReviewWhereInput = filter === 'reported' ? { reports: { some: { resolved: false } } }
      : filter === 'needs_response' ? { rating: { lte: 3 }, merchantResponse: null, isHidden: false, isDeleted: false }
      : filter === 'hidden' ? { isHidden: true }
      : {}
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * LIMIT, take: LIMIT,
        select: {
          id: true, rating: true, title: true, body: true, photos: true, isVerified: true, isApproved: true, isHidden: true, moderationReason: true,
          merchantResponse: true, merchantResponseAt: true, orderNumber: true, createdAt: true,
          user: { select: { name: true } }, product: { select: { name: true, slug: true } },
          reports: { where: { resolved: false }, select: { id: true, reason: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.review.count({ where }),
    ])
    return NextResponse.json({ success: true, data: { reviews: reviews.map((review) => ({ ...review, photos: parsePhotos(review.photos) })), total, page, pages: Math.ceil(total / LIMIT) } })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    console.error('Admin reviews fetch failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'REVIEWS_UNAVAILABLE' }, { status: 503 })
  }
}
function parsePhotos(value: string | null) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.slice(0, 5) : [] } catch { return [] } }
