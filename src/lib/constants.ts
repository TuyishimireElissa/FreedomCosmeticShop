/**
 * App-wide constants for FreedomCosmeticShop.
 * Rwanda E-Commerce - RWF only, MTN MoMo primary
 */

export const CURRENCY = {
  code: "RWF",
  symbol: "RWF",
  locale: "en-RW",
  freeDeliveryThreshold: 50000,
} as const

export const RWANDAN_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
] as const

export type Province = (typeof RWANDAN_PROVINCES)[number]

/** Standard delivery fees per province in RWF - CORRECTED */
export const DELIVERY_FEES: Record<Province, number> = {
  "Kigali City": 1000,
  "Northern Province": 3000,
  "Southern Province": 3000,
  "Eastern Province": 3500,
  "Western Province": 4000,
}

export const DELIVERY_TIMES: Record<Province, string> = {
  "Kigali City": "Same day (if ordered before 2pm) or next day",
  "Northern Province": "2-4 business days",
  "Southern Province": "2-4 business days",
  "Eastern Province": "3-5 business days",
  "Western Province": "3-5 business days",
}

export function deliveryFeeFor(province: string): number {
  return DELIVERY_FEES[province as Province] ?? 3000
}

export function deliveryTimeFor(province: string): string {
  return DELIVERY_TIMES[province as Province] ?? "3-5 business days"
}

export const PAYMENT_METHODS = {
  MTN_MOMO: {
    label: "MTN MoMo",
    shortLabel: "MTN MoMo - Most Popular",
    description: "Pay with MTN Mobile Money — you'll get a prompt on your phone.",
    icon: "📱",
    isPopular: true,
  },
  AIRTEL_MONEY: {
    label: "Airtel Money",
    shortLabel: "Airtel Money",
    description: "Pay with Airtel Money — you'll get a prompt on your phone.",
    icon: "📲",
  },
  CARD: {
    label: "Visa / Mastercard",
    shortLabel: "Card",
    description: "Pay securely with your debit or credit card via Flutterwave.",
    icon: "💳",
  },
  COD: {
    label: "Cash on Delivery",
    shortLabel: "Cash on Delivery - Kigali Only",
    description: "Pay with cash when delivered. Kigali districts only.",
    icon: "💵",
    kigaliOnly: true,
  },
} as const

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const STORE_INFO = {
  name: "FreedomCosmeticShop",
  shortName: "Freedom Cosmetic",
  tagline: "Rwanda's Beauty Freedom",
  email: "hello@freedomcosmeticshop.rw",
  phone: "+250780000000",
  whatsapp: "+250780000000",
  address: "Kigali, Rwanda",
  currency: "RWF",
  timezone: "Africa/Kigali",
  country: "Rwanda",
}

export const RWANDA_DISTRICTS_FULL = {
  "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
  "Northern Province": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
  "Southern Province": ["Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"],
  "Eastern Province": ["Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"],
  "Western Province": ["Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rusizi", "Rutsiro"],
}

// ─── VALIDATION PATTERNS (Required by validators/index.ts) ───
export const PATTERNS = {
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  rwandanPhone: /^(?:\+250|0)?7[0-9]{8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^.{6,}$/,
  orderNumber: /^UB-\d{4}-\d{5}$/,
  sku: /^[A-Z0-9-]+$/,
}

export const LIMITS = {
  productName: 200,
  productDescription: 5000,
  customerName: 100,
  customerPhone: 20,
  customerEmail: 254,
  address: 500,
  city: 100,
  orderNotes: 1000,
  shortDescription: 200,
  reviewTitle: 100,
  reviewBody: 2000,
  couponCode: 50,
  bannerTitle: 100,
}
