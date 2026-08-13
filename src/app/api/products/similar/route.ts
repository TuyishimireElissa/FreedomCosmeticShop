export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_CARD_SELECT, getRealUnitSales, serializePublicProductCard } from '@/lib/public-product'
import { scoreSimilarity } from '@/lib/product-similarity'

/**
 * Products similar to a given product.
 *
 * The scoring itself lives in src/lib/product-similarity.ts — Next.js rejects
 * any non-handler export from a route file, and it is pure logic anyway. The
 * reasoning for the weights, and for dropping the brief's colour term, is
 * documented there.
 */

const querySchema = z.object({
  id: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(12).default(4),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const parsed = querySchema.safeParse({
      id: url.searchParams.get('id') || '',
      limit: url.searchParams.get('limit') || undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'A product id is required' }, { status: 400 })
    }
    const { id, limit } = parsed.data

    const seed = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }], isActive: true, isDeleted: false },
      select: { id: true, categoryId: true, brandId: true, price: true, skinType: true },
    })
    // An unknown or hidden product is not an error — the rail simply has
    // nothing to show and the client hides itself.
    if (!seed) return NextResponse.json({ success: true, data: { products: [] }, products: [] })

    const base = { isActive: true, isDeleted: false, id: { not: seed.id } } as const

    // Score on a THIN projection, then hydrate only the survivors.
    //
    // A CORRECTION TO MY OWN REASONING. I first blamed the ~1030ms I measured
    // from the sandbox on fetching 60 full card payloads to rank and discard
    // 56. That was a guess and it was wrong: switching to a thin projection
    // left the timing unchanged. Measured breakdown against the live database
    // (sandbox->Frankfurt, 144ms baseline on a bare SELECT 1):
    //
    //     60 rows, thin projection ................  291ms
    //      4 rows, PUBLIC_PRODUCT_CARD_SELECT .....  717ms
    //      4 rows, same select minus the
    //        productImages + reviews joins ........  430ms
    //
    // The cost is PUBLIC_PRODUCT_CARD_SELECT's joins and the sandbox link, not
    // the candidate count. The existing /api/products pays exactly the same
    // price (1145ms for 12 rows from here) and serves in 81-154ms warm from
    // Vercel, which sits in the same region as the database.
    //
    // The thin projection is kept anyway: it is strictly less work, it makes
    // the ranking step independent of the card payload, and it stops a future
    // widening of the card select from also widening the scoring query.
    const SCORING_SELECT = { id: true, categoryId: true, brandId: true, price: true, stock: true, skinType: true, createdAt: true } as const

    let candidates = await prisma.product.findMany({
      where: { ...base, categoryId: seed.categoryId },
      select: SCORING_SELECT,
      take: 60,
    })

    if (candidates.length < limit) {
      const seen = new Set(candidates.map((row) => row.id))
      const nearPrice = await prisma.product.findMany({
        where: {
          ...base,
          id: { notIn: [seed.id, ...seen] },
          price: { gte: Math.round(seed.price * 0.6), lte: Math.round(seed.price * 1.6) },
        },
        select: SCORING_SELECT,
        take: 60 - candidates.length,
      })
      candidates = [...candidates, ...nearPrice]
    }

    const rankedIds = candidates
      .map((row) => ({ row, score: scoreSimilarity(row, seed) }))
      .sort((left, right) => right.score - left.score || right.row.createdAt.getTime() - left.row.createdAt.getTime())
      .slice(0, limit)
      .map((entry) => entry.row.id)

    if (rankedIds.length === 0) return NextResponse.json({ success: true, data: { products: [] }, products: [] })

    // `IN (...)` returns rows in whatever order Postgres finds them, so restore
    // the ranking after the lookup — otherwise the best match lands last.
    const position = new Map(rankedIds.map((id, index) => [id, index]))
    const unordered = await prisma.product.findMany({ where: { id: { in: rankedIds } }, select: PUBLIC_PRODUCT_CARD_SELECT })
    const ranked = unordered.sort((left, right) => (position.get(left.id) ?? 0) - (position.get(right.id) ?? 0))

    const sales = await getRealUnitSales(ranked.map((row) => row.id))
    const products = ranked.map((row) => serializePublicProductCard(row, sales.get(row.id) || 0))

    const response = NextResponse.json({ success: true, data: { products }, products })
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return response
  } catch (error) {
    console.error('Similar products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load similar products' }, { status: 500 })
  }
}
