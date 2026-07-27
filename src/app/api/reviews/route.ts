export const dynamic = 'force-dynamic'

/**
 * Legacy read-only review endpoint retained for older storefront components.
 * New submissions must use /api/reviews/submit, which verifies delivered-order
 * ownership. Public responses use an explicit allowlist and masked reviewer name.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const parsedLimit = Number(searchParams.get('limit') || '50')
    const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, Math.trunc(parsedLimit))) : 50

    const reviews = await db.review.findMany({
      where: {
        ...(productId ? { productId } : {}),
        isApproved: true,
        isVerified: true,
        isHidden: false,
        isDeleted: false,
      },
      orderBy: [{ helpfulVotes: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        skinType: true,
        shadeUsed: true,
        helpfulVotes: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    })

    const serialized = reviews.map(({ user, ...review }) => ({
      ...review,
      user: user ? { name: anonymizeName(user.name) } : null,
      isVerified: true,
    }))
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const review of serialized) distribution[review.rating as 1 | 2 | 3 | 4 | 5] += 1
    const total = serialized.length
    const average = total ? serialized.reduce((sum, review) => sum + review.rating, 0) / total : 0

    return NextResponse.json({
      reviews: serialized,
      stats: { total, average: Math.round(average * 10) / 10, distribution },
    }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
  } catch (error) {
    console.error('Legacy review read failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'REVIEWS_UNAVAILABLE' }, { status: 503 })
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'VERIFIED_ORDER_REQUIRED', submitAt: '/api/reviews/submit' },
    { status: 410 },
  )
}

function anonymizeName(name?: string | null) {
  if (!name?.trim()) return 'Customer'
  return name.trim().split(/\s+/).map((part) => `${part.charAt(0).toUpperCase()}${'*'.repeat(Math.min(3, Math.max(1, part.length - 1)))}`).join(' ')
}
