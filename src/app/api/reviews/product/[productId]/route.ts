export const dynamic = 'force-dynamic'

import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  sort: z.enum(['helpful','recent','rating_high','rating_low']).default('helpful'),
  filter: z.enum(['all','1','2','3','4','5']).default('all'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
})
const LIMIT = 10
const publicWhere = { isVerified: true, isApproved: true, isHidden: false, isDeleted: false } as const

export async function GET(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params
    if (!productId || productId.length > 100) return NextResponse.json({ success: false, error: 'INVALID_PRODUCT' }, { status: 400 })
    const url = new URL(request.url)
    const parsed = querySchema.safeParse({ sort: url.searchParams.get('sort') || undefined, filter: url.searchParams.get('filter') || undefined, page: url.searchParams.get('page') || undefined })
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_QUERY' }, { status: 400 })
    const { sort, filter, page } = parsed.data
    const where: Prisma.ReviewWhereInput = { productId: productId, ...publicWhere, ...(filter !== 'all' ? { rating: Number(filter) } : {}) }
    const orderBy: Prisma.ReviewOrderByWithRelationInput[] = sort === 'recent' ? [{ createdAt: 'desc' }]
      : sort === 'rating_high' ? [{ rating: 'desc' }, { helpfulVotes: 'desc' }, { createdAt: 'desc' }]
      : sort === 'rating_low' ? [{ rating: 'asc' }, { helpfulVotes: 'desc' }, { createdAt: 'desc' }]
      : [{ helpfulVotes: 'desc' }, { createdAt: 'desc' }]

    const [reviews, filteredTotal, allRatings] = await Promise.all([
      prisma.review.findMany({
        where, orderBy, skip: (page - 1) * LIMIT, take: LIMIT,
        select: {
          id: true, rating: true, title: true, body: true, photos: true, skinType: true, hairType: true,
          shadeUsed: true, shadeMatched: true, helpfulVotes: true, notHelpfulCount: true,
          merchantResponse: true, merchantResponseAt: true, createdAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.findMany({ where: { productId: productId, ...publicWhere }, select: { rating: true } }),
    ])
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const review of allRatings) counts[review.rating] = (counts[review.rating] || 0) + 1
    const total = allRatings.length
    const average = total ? Math.round(allRatings.reduce((sum, review) => sum + review.rating, 0) / total * 10) / 10 : 0
    const breakdown = [5,4,3,2,1].map((stars) => ({ stars, count: counts[stars], percentage: total ? Math.round(counts[stars] / total * 10_000) / 100 : 0 }))
    return NextResponse.json({ success: true, data: {
      reviews: reviews.map(({ user, photos, ...review }) => ({ ...review, photos: parsePhotos(photos), reviewer: { displayName: anonymizeName(user?.name) }, isVerified: true })),
      total: filteredTotal,
      pages: Math.ceil(filteredTotal / LIMIT),
      page,
      distribution: { total, average, breakdown },
      stats: { totalReviews: total, averageRating: average, verifiedCount: total, verifiedPercentage: total ? 100 : 0 },
    } })
  } catch (error) {
    console.error('Product reviews fetch failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'REVIEWS_UNAVAILABLE' }, { status: 503 })
  }
}

function anonymizeName(name?: string | null) {
  if (!name?.trim()) return 'Customer'
  return name.trim().split(/\s+/).map((part) => `${part.charAt(0).toUpperCase()}${'*'.repeat(Math.min(3, Math.max(1, part.length - 1)))}`).join(' ')
}
function parsePhotos(value: string | null) {
  try {
    const photos = JSON.parse(value || '[]')
    return Array.isArray(photos) ? photos.filter((photo): photo is string => typeof photo === 'string').slice(0, 5) : []
  } catch { return [] }
}
