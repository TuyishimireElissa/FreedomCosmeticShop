/**
 * Currency & formatting helpers for FreedomCosmeticShop.
 * All prices are stored in RWF (Rwandan Franc) as integers.
 */

/**
 * Format an integer RWF amount as "RWF 12,500"
 */
export function formatRWF(amount: number): string {
  return `RWF ${new Intl.NumberFormat("en-RW").format(amount)}`
}

/**
 * Compact format for small UI elements: "RWF 12.5k"
 */
export function formatRWFCompact(amount: number): string {
  if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `RWF ${(amount / 1_000).toFixed(1)}k`
  return `RWF ${amount}`
}

/**
 * Rwandan provinces for the address form.
 */
export const RWANDAN_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
] as const

/**
 * Standard delivery fee per province (in RWF).
 *
 * Pricing per the checkout spec:
 *   - Kigali City (all 3 districts): 1,000 RWF (same-day delivery available)
 *   - Northern Province: 3,000 RWF
 *   - Southern Province: 3,000 RWF
 *   - Eastern Province: 3,500 RWF
 *   - Western Province: 4,000 RWF
 */
export const DELIVERY_FEES: Record<string, number> = {
  "Kigali City": 1000,
  "Northern Province": 3000,
  "Southern Province": 3000,
  "Eastern Province": 3500,
  "Western Province": 4000,
}

export function deliveryFeeFor(province: string): number {
  return DELIVERY_FEES[province] ?? 3000
}

/**
 * Estimated delivery time per province.
 */
export const DELIVERY_TIMES: Record<string, string> = {
  "Kigali City": "Same day (if ordered before 2pm) or next day",
  "Northern Province": "2-4 business days",
  "Southern Province": "2-4 business days",
  "Eastern Province": "3-5 business days",
  "Western Province": "3-5 business days",
}

export function deliveryTimeFor(province: string): string {
  return DELIVERY_TIMES[province] || "3-5 business days"
}

/**
 * Payment method labels (extended for multi-step checkout).
 */
export const PAYMENT_METHODS = {
  MTN_MOMO: {
    label: "MTN Mobile Money",
    shortLabel: "MTN MoMo",
    description: "Pay instantly with your MTN phone. You'll get a prompt to approve.",
    icon: "",
    color: "#FFCC00",
    textColor: "#000000",
  },
  AIRTEL_MONEY: {
    label: "Airtel Money",
    shortLabel: "Airtel",
    description: "Pay instantly with your Airtel phone. You'll get a prompt to approve.",
    icon: "",
    color: "#E40000",
    textColor: "#FFFFFF",
  },
  CARD: {
    label: "Visa / Mastercard",
    shortLabel: "Card",
    description: "Pay securely with your debit or credit card via Flutterwave.",
    icon: "",
    color: "#1a1a1a",
    textColor: "#FFFFFF",
  },
  COD: {
    label: "Cash on Delivery",
    shortLabel: "COD",
    description: "Pay with cash when your order is delivered. Kigali only.",
    icon: "",
    color: "#10B981",
    textColor: "#FFFFFF",
  },
  BANK_TRANSFER: {
    label: "Bank Transfer",
    shortLabel: "Bank",
    description: "Transfer to our bank account. Order ships after confirmation.",
    icon: "",
    color: "#3B82F6",
    textColor: "#FFFFFF",
  },
} as const

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS

/**
 * Bank account details for bank transfer option.
 */
export const BANK_ACCOUNTS = [
  {
    bank: "Bank of Kigali (BK)",
    accountName: "FreedomCosmeticShop Ltd",
    accountNumber: "0123456789",
    branch: "Head Office — Kigali",
  },
  {
    bank: "Equity Bank Rwanda",
    accountName: "FreedomCosmeticShop Ltd",
    accountNumber: "0102345678",
    branch: "Kigali Branch",
  },
  {
    bank: "I&M Bank Rwanda",
    accountName: "FreedomCosmeticShop Ltd",
    accountNumber: "0203456789",
    branch: "KN 4 Ave Branch",
  },
] as const
