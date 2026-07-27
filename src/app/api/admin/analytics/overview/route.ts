export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EVENTS } from '@/lib/analytics-events'
import { boundedDays, percentage } from '@/lib/analytics-overview'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

const responseHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ANALYTICS_READ)
    const days = boundedDays(new URL(request.url).searchParams.get('days'))
    if (!days) return NextResponse.json({ success: false, error: 'INVALID_PERIOD' }, { status: 400, headers: responseHeaders })
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const whereSince = { createdAt: { gte: since } }

    const [
      pageViews,
      categoryViews,
      productViews,
      searches,
      zeroResults,
      addToCarts,
      removeFromCarts,
      cartViews,
      beginCheckout,
      addressCompleted,
      paymentSelected,
      paymentStarted,
      paymentFailures,
      purchases,
      trackedPurchaseValue,
      whatsAppClicks,
      reviewsSubmitted,
      wholesaleStarted,
      wholesaleCompleted,
      byDevice,
      byDistrict,
      byLanguage,
      byPaymentMethod,
      byCategory,
      topProducts,
    ] = await Promise.all([
      prisma.analyticsEvent.count({ where: { event: EVENTS.PAGE_VIEW, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.CATEGORY_VIEW, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.PRODUCT_VIEW, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.SEARCH, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.ZERO_RESULT_SEARCH, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.ADD_TO_CART, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.REMOVE_FROM_CART, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.VIEW_CART, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.BEGIN_CHECKOUT, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.ADDRESS_COMPLETED, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.PAYMENT_SELECTED, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.PAYMENT_STARTED, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.PAYMENT_FAILED, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.PURCHASE_COMPLETED, ...whereSince } }),
      prisma.analyticsEvent.aggregate({ where: { event: EVENTS.PURCHASE_COMPLETED, ...whereSince }, _sum: { value: true } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.WHATSAPP_CLICKED, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.REVIEW_SUBMITTED, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.WHOLESALE_APP_STARTED, ...whereSince } }),
      prisma.analyticsEvent.count({ where: { event: EVENTS.WHOLESALE_APP_COMPLETED, ...whereSince } }),
      prisma.analyticsEvent.groupBy({ by: ['device'], where: { event: EVENTS.PAGE_VIEW, ...whereSince }, _count: { _all: true } }),
      prisma.analyticsEvent.groupBy({ by: ['district'], where: { event: EVENTS.PURCHASE_COMPLETED, district: { not: null }, ...whereSince }, _count: { _all: true }, orderBy: { _count: { district: 'desc' } }, take: 10 }),
      prisma.analyticsEvent.groupBy({ by: ['language'], where: { event: EVENTS.PAGE_VIEW, ...whereSince }, _count: { _all: true } }),
      prisma.analyticsEvent.groupBy({ by: ['paymentMethod'], where: { event: EVENTS.PURCHASE_COMPLETED, paymentMethod: { not: null }, ...whereSince }, _count: { _all: true } }),
      prisma.analyticsEvent.groupBy({ by: ['productCategory'], where: { event: EVENTS.PRODUCT_VIEW, productCategory: { not: null }, ...whereSince }, _count: { _all: true }, orderBy: { _count: { productCategory: 'desc' } }, take: 10 }),
      prisma.analyticsEvent.groupBy({ by: ['productId', 'productSlug'], where: { event: EVENTS.PRODUCT_VIEW, productId: { not: null }, ...whereSince }, _count: { _all: true }, orderBy: { _count: { productId: 'desc' } }, take: 10 }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        period: { days, since: since.toISOString() },
        overview: {
          pageViews,
          categoryViews,
          productViews,
          searches,
          zeroResultSearches: zeroResults,
          addToCarts,
          removeFromCarts,
          cartViews,
          purchases,
          trackedPurchaseValue: Number(trackedPurchaseValue._sum.value || 0),
          paymentFailures,
          whatsAppClicks,
          reviewsSubmitted,
          wholesaleApplicationsStarted: wholesaleStarted,
          wholesaleApplicationsCompleted: wholesaleCompleted,
          checkoutCompletionRate: percentage(purchases, beginCheckout),
          addToCartToPurchaseEventRate: percentage(purchases, addToCarts),
        },
        funnel: {
          beginCheckout,
          addressCompleted,
          paymentSelected,
          paymentStarted,
          purchaseCompleted: purchases,
        },
        segments: {
          byDevice: byDevice.map((row) => ({ device: row.device || 'unknown', count: row._count._all })),
          byDistrict: byDistrict.map((row) => ({ district: row.district, count: row._count._all })),
          byLanguage: byLanguage.map((row) => ({ language: row.language || 'unknown', count: row._count._all })),
          byPaymentMethod: byPaymentMethod.map((row) => ({ method: row.paymentMethod, count: row._count._all })),
          byCategory: byCategory.map((row) => ({ category: row.productCategory, count: row._count._all })),
          topProducts: topProducts.map((row) => ({ productId: row.productId, productSlug: row.productSlug, count: row._count._all })),
        },
        methodology: {
          consentedEventsOnly: true,
          trackedPurchaseValueIsClientReported: true,
          ratesAreEventRatiosNotUniqueCustomerRates: true,
          rawSearchQueriesStored: false,
        },
      },
    }, { headers: responseHeaders })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode, headers: responseHeaders })
    }
    console.error('Analytics overview failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'ANALYTICS_UNAVAILABLE' }, { status: 503, headers: responseHeaders })
  }
}
