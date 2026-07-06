/**
 * Currency & formatting helpers for Ubumwe Beauty.
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
 * Kigali = 1,500; other provinces = 3,000.
 */
export function deliveryFeeFor(province: string): number {
  if (!province) return 0
  if (province === "Kigali City") return 1500
  return 3000
}

/**
 * Payment method labels
 */
export const PAYMENT_METHODS = {
  MTN_MOMO: {
    label: "MTN MoMo",
    description: "Pay with MTN Mobile Money — you'll get a prompt on your phone.",
    icon: "📱",
  },
  COD: {
    label: "Cash on Delivery",
    description: "Pay with cash when your order is delivered to your door.",
    icon: "💵",
  },
} as const

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS
