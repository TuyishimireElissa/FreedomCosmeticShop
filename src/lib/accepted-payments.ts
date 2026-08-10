/**
 * The payment methods the shop can actually accept, in one place.
 *
 * This list is the single source of truth for every customer-facing claim —
 * the footer badge row, the schema.org `paymentAccepted` property, and the
 * payment FAQ. It exists because those three drifted apart: the homepage trust
 * card was corrected to drop Visa/Mastercard while the footer went on
 * advertising them on every page and structured data went on telling Google
 * the same thing.
 *
 * Card payment is deliberately absent. `payments.enabled` is false — PayPack
 * has no credentials and its KYC needs RDB registration the owner has deferred
 * — so a customer who chose a card could not complete an order. The PayPack
 * and Flutterwave integrations remain in the codebase, feature-flagged, ready
 * for the day that changes. Add the entries back here when it does, and every
 * surface updates together.
 *
 * `payments-truth.test.ts` fails the build if a card claim reappears in any
 * customer-facing string while the flag is off.
 */

/** Display labels for the footer badge row. */
export const ACCEPTED_PAYMENTS = ['MTN MoMo', 'Airtel Money', 'Cash on Delivery'] as const

/** schema.org `paymentAccepted` values — spelled out for search engines. */
export const ACCEPTED_PAYMENTS_SCHEMA = ['MTN Mobile Money', 'Airtel Money', 'Cash on Delivery'] as const
