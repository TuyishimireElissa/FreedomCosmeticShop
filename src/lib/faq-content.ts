/**
 * The FAQ question/answer pairs, as translation keys.
 *
 * Shared so the rendered accordion and the FAQPage JSON-LD are driven by one
 * list. When they were two lists, nothing stopped the schema from claiming a
 * question the page did not actually show — which is exactly the mismatch
 * Google's structured-data guidelines prohibit.
 */
export const FAQ_KEYS = [
  ['pages.faq_authentic_q', 'pages.faq_authentic_a'],
  ['pages.faq_delivery_q', 'pages.faq_delivery_a'],
  ['pages.faq_payment_q', 'pages.faq_payment_a'],
  ['pages.faq_delivery_time_q', 'pages.faq_delivery_time_a'],
  ['pages.faq_returns_q', 'pages.faq_returns_a'],
  ['pages.faq_tracking_q', 'pages.faq_tracking_a'],
  ['pages.faq_wholesale_q', 'pages.faq_wholesale_a'],
  ['pages.faq_coupon_q', 'pages.faq_coupon_a'],
] as const
