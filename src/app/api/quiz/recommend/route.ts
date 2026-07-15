export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { HairType, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/permissions'
import { PUBLIC_PRODUCT_SELECT, getRealUnitSales, serializePublicProduct } from '@/lib/public-product'
import { authenticatedSearchUserId, normalizeSearchSession } from '@/server/services/search-analytics'
import { buildRecommendationQuery, type QuizAnswers } from '@/lib/quiz-logic'

const AnswersSchema = z.object({
  category: z.enum(['skin', 'hair', 'makeup']),
  mainConcern: z.string().trim().min(2).max(60),
  skinType: z.enum(['ALL', 'OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL']).optional(),
  hairType: z.nativeEnum(HairType).optional(),
  preferredResult: z.string().trim().min(2).max(60),
  budget: z.enum(['under5k', '5k-15k', '15k-50k', '50k+']),
  sensitivity: z.enum(['none', 'some', 'high']),
  language: z.enum(['rw', 'en']).default('rw'),
  sessionId: z.string().trim().max(128).optional(),
})

const SAFE_BUNDLE_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  stock: true,
  volume: true,
  images: true,
  productImages: {
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    take: 1,
    select: { url: true, publicId: true, altText: true, altTextRw: true, isPrimary: true },
  },
} satisfies Prisma.ProductSelect

export async function POST(request: NextRequest) {
  try {
    const parsed = AnswersSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid quiz answers' }, { status: 400 })
    const answers = parsed.data
    const sessionId = normalizeSearchSession(answers.sessionId || request.headers.get('x-session-id'))
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous'
    const limit = rateLimit(`quiz:${sessionId || forwarded}`, { maxActions: 20, windowMs: 60 * 60 * 1000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many quiz requests' }, { status: 429 })

    const recommendation = buildRecommendationQuery(answers as QuizAnswers)
    const searchConditions: Prisma.ProductWhereInput[] = recommendation.searchTerms.slice(0, 12).flatMap((term) => [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { shortDescription: { contains: term, mode: 'insensitive' } },
      { ingredients: { contains: term, mode: 'insensitive' } },
      { ingredientsRw: { contains: term, mode: 'insensitive' } },
      { expectedResults: { contains: term, mode: 'insensitive' } },
      { expectedResultsRw: { contains: term, mode: 'insensitive' } },
      { category: { name: { contains: term, mode: 'insensitive' } } },
    ])
    const and: Prisma.ProductWhereInput[] = [
      { isActive: true, isDeleted: false, stock: { gt: 0 } },
      { category: { slug: recommendation.category } },
    ]
    if (searchConditions.length) and.push({ OR: searchConditions })
    if (recommendation.skinType) and.push({ OR: [{ skinType: { contains: recommendation.skinType } }, { skinType: { contains: 'ALL' } }] })
    if (recommendation.hairType) and.push({ OR: [{ hairType: recommendation.hairType as HairType }, { hairType: 'ALL_HAIR' }] })
    if (recommendation.minPrice !== undefined || recommendation.maxPrice !== undefined) and.push({ price: { ...(recommendation.minPrice !== undefined ? { gte: recommendation.minPrice } : {}), ...(recommendation.maxPrice !== undefined ? { lte: recommendation.maxPrice } : {}) } })
    if (recommendation.excludeRecordedAllergens) and.push({ allergens: { isEmpty: true } })

    const rows = await prisma.product.findMany({ where: { AND: and }, select: PUBLIC_PRODUCT_SELECT, orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }], take: 8 })
    const sales = await getRealUnitSales(rows.map((product) => product.id))
    const products = rows.map((product) => serializePublicProduct(product, sales.get(product.id) || 0))

    const bundleRows = await prisma.bundle.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        targetCategory: recommendation.category,
        ...(answers.mainConcern ? { OR: [{ targetConcern: answers.mainConcern }, { targetConcern: null }] } : {}),
      },
      include: { products: { include: { product: { select: SAFE_BUNDLE_PRODUCT_SELECT } }, orderBy: { stepOrder: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    })
    const bundles = bundleRows
      .filter((bundle) => bundle.products.length > 0)
      .map((bundle) => {
        const normalTotal = bundle.products.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
        const savings = normalTotal - bundle.bundlePrice
        const isInStock = bundle.products.every((item) => item.product.stock >= item.quantity)
        return {
          ...bundle,
          normalTotal,
          savings,
          savingsPercent: normalTotal > 0 ? Math.round((savings / normalTotal) * 100) : 0,
          isInStock,
          products: bundle.products.map((item) => ({ ...item, isInStock: item.product.stock >= item.quantity })),
        }
      })
      .filter((bundle) => bundle.isInStock)
      .slice(0, 3)

    const userId = await authenticatedSearchUserId(request)
    await prisma.quizResult.create({
      data: {
        sessionId,
        userId,
        category: answers.category,
        mainConcern: answers.mainConcern,
        skinType: answers.skinType || null,
        hairType: answers.hairType || null,
        preferredResult: answers.preferredResult,
        budget: answers.budget,
        sensitivity: answers.sensitivity,
        recommendedProductIds: products.map((product) => product.id),
        recommendedBundleIds: bundles.map((bundle) => bundle.id),
        language: answers.language,
      },
    })

    const response = NextResponse.json({ success: true, data: { products, bundles, queryUsed: recommendation, totalFound: products.length, sensitivityNotice: answers.sensitivity === 'high' } })
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    console.error('Quiz recommendation error:', error)
    return NextResponse.json({ success: false, error: 'Recommendation failed' }, { status: 500 })
  }
}
