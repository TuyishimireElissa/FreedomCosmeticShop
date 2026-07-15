import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const REVIEW_WHERE = {
  isApproved: true,
  isDeleted: false,
} as const

export async function GET(request: NextRequest) {
  try {
    const requested = Number(new URL(request.url).searchParams.get('limit') || 3)
    const limit = Number.isInteger(requested) ? Math.min(6, Math.max(3, requested)) : 3

    const [candidates, aggregate, verifiedCount] = await Promise.all([
      prisma.review.findMany({
        where: {
          ...REVIEW_WHERE,
          body: { not: null },
        },
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          skinType: true,
          orderId: true,
          createdAt: true,
          user: { select: { name: true } },
          product: { select: { name: true, slug: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { helpfulVotes: 'desc' }, { createdAt: 'desc' }],
        take: limit * 4,
      }),
      prisma.review.aggregate({
        where: REVIEW_WHERE,
        _count: { id: true },
        _avg: { rating: true },
      }),
      prisma.review.count({
        where: {
          ...REVIEW_WHERE,
          orderId: { not: null },
        },
      }),
    ])

    const reviews = candidates
      .filter((review) => (review.body?.trim().split(/\s+/).length || 0) >= 4)
      .slice(0, limit)
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.body,
        skinType: review.skinType,
        isVerified: review.orderId !== null,
        createdAt: review.createdAt,
        user: {
          displayName: review.user?.name ? formatDisplayName(review.user.name) : null,
        },
        product: review.product,
      }))

    return NextResponse.json(
      {
        success: true,
        data: {
          reviews,
          stats: {
            totalReviews: aggregate._count.id,
            averageRating: Math.round((aggregate._avg.rating || 0) * 10) / 10,
            verifiedCount,
          },
        },
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Homepage reviews API error:', error)
    return NextResponse.json({ success: false, data: null }, { status: 500 })
  }
}

function formatDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] || null
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}
