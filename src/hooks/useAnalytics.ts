'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { EVENTS, trackEvent } from '@/lib/analytics'
import type { AnalyticsPaymentMethod, SafeAnalyticsMetadata } from '@/lib/analytics-events'

export function useAnalytics({ trackPageViews = false }: { trackPageViews?: boolean } = {}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPageEvent = useRef('')

  useEffect(() => {
    if (!trackPageViews) return
    const category = searchParams.get('category')
    const hasSearch = Boolean(searchParams.get('search') || searchParams.get('q'))
    const signature = `${pathname}|${category || ''}|${hasSearch ? 'search' : ''}`
    if (signature === lastPageEvent.current) return
    lastPageEvent.current = signature

    if (category && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) {
      void trackEvent({ event: EVENTS.CATEGORY_VIEW, path: pathname, productCategory: category, metadata: { source: 'navigation' } })
    } else if (hasSearch) {
      // The raw query may contain PII, so only the occurrence is tracked.
      void trackEvent({ event: EVENTS.SEARCH, path: pathname, metadata: { source: 'navigation' } })
    } else {
      void trackEvent({ event: EVENTS.PAGE_VIEW, path: pathname, metadata: { source: 'navigation' } })
    }
  }, [pathname, searchParams, trackPageViews])

  const trackProductView = useCallback((product: { id: string; slug: string; category?: string }) => {
    void trackEvent({ event: EVENTS.PRODUCT_VIEW, productId: product.id, productSlug: product.slug, productCategory: product.category, metadata: { source: 'automatic' } })
  }, [])

  const trackAddToCart = useCallback((productId: string) => {
    void trackEvent({ event: EVENTS.ADD_TO_CART, productId, metadata: { source: 'button' } })
  }, [])

  const trackRemoveFromCart = useCallback((productId: string) => {
    void trackEvent({ event: EVENTS.REMOVE_FROM_CART, productId, metadata: { source: 'button' } })
  }, [])

  const trackAddToWishlist = useCallback((productId: string) => {
    void trackEvent({ event: EVENTS.ADD_TO_WISHLIST, productId, metadata: { source: 'button' } })
  }, [])

  const trackRemoveFromWishlist = useCallback((productId: string) => {
    void trackEvent({ event: EVENTS.REMOVE_FROM_WISHLIST, productId, metadata: { source: 'button' } })
  }, [])

  const trackBeginCheckout = useCallback(() => {
    void trackEvent({ event: EVENTS.BEGIN_CHECKOUT, path: '/checkout', metadata: { step: 'address', source: 'automatic' } })
  }, [])

  const trackAddressCompleted = useCallback((district: string) => {
    void trackEvent({ event: EVENTS.ADDRESS_COMPLETED, path: '/checkout', district, metadata: { step: 'address', source: 'button' } })
  }, [])

  const trackPaymentSelected = useCallback((paymentMethod: AnalyticsPaymentMethod) => {
    void trackEvent({ event: EVENTS.PAYMENT_SELECTED, path: '/checkout', paymentMethod, metadata: { step: 'payment', source: 'button' } })
  }, [])

  const trackPaymentStarted = useCallback((paymentMethod: AnalyticsPaymentMethod, value: number) => {
    void trackEvent({ event: EVENTS.PAYMENT_STARTED, path: '/checkout', paymentMethod, value, metadata: { step: 'payment', source: 'button' } })
  }, [])

  const trackPaymentFailed = useCallback((paymentMethod: AnalyticsPaymentMethod, reasonCode?: string) => {
    const metadata: SafeAnalyticsMetadata = { step: 'payment', ...(reasonCode ? { reasonCode } : {}) }
    void trackEvent({ event: EVENTS.PAYMENT_FAILED, path: '/checkout', paymentMethod, metadata })
  }, [])

  const trackPurchaseCompleted = useCallback((value: number, paymentMethod: AnalyticsPaymentMethod, district: string) => {
    void trackEvent({ event: EVENTS.PURCHASE_COMPLETED, path: '/checkout', value, paymentMethod, district, metadata: { step: 'confirmation', source: 'automatic' } })
  }, [])

  const trackQuizStarted = useCallback(() => {
    void trackEvent({ event: EVENTS.QUIZ_STARTED, path: '/quiz', metadata: { source: 'button' } })
  }, [])

  const trackQuizCompleted = useCallback(() => {
    void trackEvent({ event: EVENTS.QUIZ_COMPLETED, path: '/quiz', metadata: { source: 'automatic' } })
  }, [])

  const trackReviewSubmitted = useCallback((productId: string) => {
    void trackEvent({ event: EVENTS.REVIEW_SUBMITTED, productId, metadata: { context: 'review', source: 'button' } })
  }, [])

  const trackWholesaleApplicationStarted = useCallback(() => {
    void trackEvent({ event: EVENTS.WHOLESALE_APP_STARTED, path: '/wholesale', metadata: { context: 'wholesale', source: 'automatic' } })
  }, [])

  const trackWholesaleApplicationCompleted = useCallback(() => {
    void trackEvent({ event: EVENTS.WHOLESALE_APP_COMPLETED, path: '/wholesale', metadata: { context: 'wholesale', source: 'button' } })
  }, [])

  const trackCouponApplied = useCallback((couponType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING') => {
    void trackEvent({ event: EVENTS.COUPON_APPLIED, metadata: { couponType, source: 'button' } })
  }, [])

  const trackWhatsAppClicked = useCallback((context: SafeAnalyticsMetadata['context']) => {
    void trackEvent({ event: EVENTS.WHATSAPP_CLICKED, metadata: { context, source: 'button' } })
  }, [])

  return {
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackAddToWishlist,
    trackRemoveFromWishlist,
    trackBeginCheckout,
    trackAddressCompleted,
    trackPaymentSelected,
    trackPaymentStarted,
    trackPaymentFailed,
    trackPurchaseCompleted,
    trackQuizStarted,
    trackQuizCompleted,
    trackReviewSubmitted,
    trackWholesaleApplicationStarted,
    trackWholesaleApplicationCompleted,
    trackCouponApplied,
    trackWhatsAppClicked,
  }
}

export function AnalyticsPageTracker() {
  useAnalytics({ trackPageViews: true })
  return null
}
