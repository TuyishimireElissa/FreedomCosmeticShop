/**
 * Format helpers for the mobile app.
 * Mirrors the web app's format.ts.
 */

export function formatRWF(amount: number): string {
  return `RWF ${new Intl.NumberFormat("en-RW").format(amount)}`
}

export function formatRWFCompact(amount: number): string {
  if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `RWF ${(amount / 1_000).toFixed(1)}k`
  return `RWF ${amount}`
}

export const PAYMENT_METHODS = {
  MTN_MOMO: { label: "MTN MoMo", icon: "📱", color: "#FFCC00" },
  AIRTEL_MONEY: { label: "Airtel Money", icon: "📲", color: "#E40000" },
  CARD: { label: "Visa/Mastercard", icon: "💳", color: "#1a1a1a" },
  COD: { label: "Cash on Delivery", icon: "💵", color: "#10B981" },
} as const

export const RWANDAN_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
] as const

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
