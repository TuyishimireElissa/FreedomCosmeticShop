/**
 * App-wide constants for Ubumwe Beauty.
 *
 * These are used across the storefront, checkout, and admin dashboard.
 * Keep them here so they can be changed in one place.
 */

// ============================================================================
// CURRENCY
// ============================================================================
export const CURRENCY = {
  code: "RWF",
  symbol: "RWF",
  locale: "en-RW",
  /** Minimum price in RWF that qualifies for free delivery in Kigali */
  freeDeliveryThreshold: 50000,
} as const

// ============================================================================
// DELIVERY
// ============================================================================
export const RWANDAN_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
] as const

export type Province = (typeof RWANDAN_PROVINCES)[number]

/** Standard delivery fees per province in RWF */
export const DELIVERY_FEES: Record<Province, number> = {
  "Kigali City": 1500,
  "Northern Province": 3000,
  "Southern Province": 3000,
  "Eastern Province": 3000,
  "Western Province": 3000,
}

/** Delivery time estimate per province (in business days) */
export const DELIVERY_TIMES: Record<Province, string> = {
  "Kigali City": "1-2 business days",
  "Northern Province": "3-5 business days",
  "Southern Province": "3-5 business days",
  "Eastern Province": "3-5 business days",
  "Western Province": "3-5 business days",
}

export function deliveryFeeFor(province: string): number {
  return DELIVERY_FEES[province as Province] ?? 0
}

// ============================================================================
// PAYMENTS
// ============================================================================
export const PAYMENT_METHODS = {
  MTN_MOMO: {
    label: "MTN MoMo",
    description: "Pay with MTN Mobile Money — you'll get a prompt on your phone.",
    icon: "📱",
  },
  AIRTEL_MONEY: {
    label: "Airtel Money",
    description: "Pay with Airtel Money — you'll get a prompt on your phone.",
    icon: "📲",
  },
  CARD: {
    label: "Visa / Mastercard",
    description: "Pay securely with your debit or credit card.",
    icon: "💳",
  },
  COD: {
    label: "Cash on Delivery",
    description: "Pay with cash when your order is delivered to your door.",
    icon: "💵",
  },
} as const

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS

// ============================================================================
// ORDER STATUSES
// ============================================================================
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/** Allowed status transitions (workflow). */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

/** Color classes for status badges (Tailwind) */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
}

// ============================================================================
// CART
// ============================================================================
export const CART = {
  /** Maximum quantity of a single product in cart */
  maxQuantityPerProduct: 99,
  /** Maximum total items in cart */
  maxItems: 50,
  /** localStorage key for cart persistence */
  storageKey: "ubumwe-store",
} as const

// ============================================================================
// PAGINATION
// ============================================================================
export const PAGINATION = {
  defaultPageSize: 24,
  maxPageSize: 100,
} as const

// ============================================================================
// SEARCH
// ============================================================================
export const SEARCH = {
  minQueryLength: 2,
  maxQueryLength: 100,
} as const

// ============================================================================
// REGEX PATTERNS
// ============================================================================
export const PATTERNS = {
  /** Rwandan phone: 07XXXXXXXX, +2507XXXXXXXX, or 2507XXXXXXXX */
  rwandanPhone: /^(?:\+250|0)?7[0-9]{8}$/,
  /** Email */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** URL */
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  /** Slug (lowercase, hyphenated) */
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const

// ============================================================================
// STORAGE LIMITS
// ============================================================================
export const LIMITS = {
  productName: 200,
  productDescription: 2000,
  orderNotes: 500,
  address: 300,
  customerName: 100,
  customerPhone: 20,
  customerEmail: 200,
  city: 100,
} as const
