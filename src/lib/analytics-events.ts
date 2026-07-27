export const EVENTS = {
  PAGE_VIEW: 'page_view',
  CATEGORY_VIEW: 'category_view',
  PRODUCT_VIEW: 'product_view',
  SEARCH: 'search',
  ZERO_RESULT_SEARCH: 'zero_result_search',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  VIEW_CART: 'view_cart',
  ADD_TO_WISHLIST: 'add_to_wishlist',
  REMOVE_FROM_WISHLIST: 'remove_from_wishlist',
  BEGIN_CHECKOUT: 'begin_checkout',
  ADDRESS_COMPLETED: 'address_completed',
  PAYMENT_SELECTED: 'payment_selected',
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_FAILED: 'payment_failed',
  PURCHASE_COMPLETED: 'purchase_completed',
  COUPON_APPLIED: 'coupon_applied',
  COUPON_REJECTED: 'coupon_rejected',
  WHATSAPP_CLICKED: 'whatsapp_clicked',
  REVIEW_SUBMITTED: 'review_submitted',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  WHOLESALE_APP_STARTED: 'wholesale_app_started',
  WHOLESALE_APP_COMPLETED: 'wholesale_app_completed',
  REFERRAL_SHARED: 'referral_shared',
  LOYALTY_REDEEMED: 'loyalty_redeemed',
} as const

export type EventName = typeof EVENTS[keyof typeof EVENTS]
export type AnalyticsDevice = 'mobile' | 'desktop' | 'tablet'
export type AnalyticsLanguage = 'rw' | 'en'
export type AnalyticsPaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CARD' | 'COD' | 'BANK_TRANSFER'

export interface SafeAnalyticsMetadata {
  quantity?: number
  resultCount?: number
  context?: 'product' | 'cart' | 'checkout' | 'support' | 'floating_button' | 'review' | 'wholesale'
  step?: 'address' | 'payment' | 'review' | 'confirmation'
  reasonCode?: string
  couponType?: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'
  source?: 'navigation' | 'button' | 'automatic'
}

export interface TrackEventData {
  event: EventName
  path?: string
  productId?: string
  productSlug?: string
  productCategory?: string
  district?: string
  paymentMethod?: AnalyticsPaymentMethod
  value?: number
  metadata?: SafeAnalyticsMetadata
}
