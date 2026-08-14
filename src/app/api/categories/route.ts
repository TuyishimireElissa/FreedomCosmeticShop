import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public category list.
 *
 * WHAT CHANGED, AND WHY
 *
 * This route used to hide any category with no in-stock products. That rule
 * was well-intentioned — it stopped a shopper reaching an empty shelf — but
 * it put the site at odds with itself: the homepage grid hid Makeup while the
 * navbar and footer, which hardcoded their own lists, still linked to it. A
 * shopper tapping "Ibikoresho byo kwisiga" landed on "No products match your
 * filters".
 *
 * Owner decision 2026-08-14: visibility is an OWNER decision, not a
 * side-effect of stock. A category is visible when the owner says
 * `isActive`, full stop. Makeup stays visible while its photos are prepared,
 * and an empty category renders a Coming Soon page instead of an error.
 *
 * So the stock filter is gone from the WHERE clause. It is deliberately KEPT
 * inside `_count`, because the count still has to mean "products a shopper
 * can actually buy right now" — that is what drives the Soon badge and the
 * Coming Soon page. A count that included out-of-stock or deleted rows would
 * make an empty category look stocked.
 */
export async function GET() {
  try {
    // Live products only: active, not deleted, and actually on the shelf.
    const liveProducts = { isActive: true, isDeleted: false, stock: { gt: 0 } } as const

    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      include: {
        _count: { select: { products: { where: liveProducts } } },
        children: {
          where: { isActive: true, isDeleted: false },
          include: { _count: { select: { products: { where: liveProducts } } } },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    const response = NextResponse.json({
      success: true,
      data: { categories },
      categories,
    })
    // Shorter than the previous 5 minutes: an owner toggling a category off
    // in admin expects the nav to follow quickly. The realtime broadcast
    // already pushes the change, so this is only the cold-load ceiling.
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}
