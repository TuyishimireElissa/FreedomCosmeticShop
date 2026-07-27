export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'
import { getPersonalizedRecommendations } from '@/server/services/personalized-recommendations'

const query = z.object({ limit: z.coerce.number().int().min(1).max(8).default(4) }).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' }

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
    const parsed = query.safeParse({ limit: new URL(request.url).searchParams.get('limit') || undefined })
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_LIMIT' }, { status: 400, headers })
    const limit = rateLimit(`personalized-recommendations:${user.id}`, { maxActions: 30, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

    const recommendation = await getPersonalizedRecommendations(user.id, parsed.data.limit)
    return NextResponse.json({
      ...recommendation,
      methodology: {
        currentCatalogueOnly: true,
        inStockOnly: true,
        excludesPreviouslyPurchasedProducts: true,
        createsPersistentCustomerProfile: false,
        sensitiveQuizAnswersReturned: false,
      },
    }, { headers })
  } catch (error) {
    console.error('Personalized recommendation failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'RECOMMENDATIONS_UNAVAILABLE' }, { status: 503, headers })
  }
}
