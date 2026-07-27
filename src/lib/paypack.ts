/**
 * PayPack frontend helpers — phone validation + formatting for MoMo payments.
 *
 * These functions wrap the existing src/lib/phone.ts and src/lib/format.ts
 * to provide a single import point for checkout payment components.
 *
 * MTN Rwanda: 078XXXXXXX or 079XXXXXXX (+250780000000)
 * Airtel Rwanda: 072XXXXXXX or 073XXXXXXX (+250730000000)
 */

import {
  normalizeRwandaPhone,
  detectNetwork,
  formatRwandaPhoneDisplay,
} from "@/lib/phone"
import { formatRWF, formatRWFCompact } from "@/lib/format"

// Re-export for convenience
export { normalizeRwandaPhone, detectNetwork, formatRwandaPhoneDisplay }
export { formatRWF, formatRWFCompact }

/**
 * Validate that a phone number is an MTN Rwanda number.
 * MTN prefixes: 078, 079
 */
export function validateMTNPhone(phone: string): boolean {
  try {
    const normalized = normalizeRwandaPhone(phone)
    const prefix = normalized.slice(4, 6) // "78" or "79"
    return prefix === "78" || prefix === "79"
  } catch {
    return false
  }
}

/**
 * Validate that a phone number is an Airtel Rwanda number.
 * Airtel prefixes: 072, 073
 */
export function validateAirtelPhone(phone: string): boolean {
  try {
    const normalized = normalizeRwandaPhone(phone)
    const prefix = normalized.slice(4, 6) // "72" or "73"
    return prefix === "72" || prefix === "73"
  } catch {
    return false
  }
}

/**
 * Format a phone number for display: +250 788 123 456
 */
export function formatRwandaPhone(phone: string): string {
  try {
    return formatRwandaPhoneDisplay(phone)
  } catch {
    return phone
  }
}

/**
 * Get the network name from a phone number.
 * Returns "MTN" | "AIRTEL" | "UNKNOWN"
 */
export function getNetworkName(phone: string): string {
  return detectNetwork(phone)
}

/**
 * Check if a phone number is valid for a given network.
 */
export function isValidForNetwork(phone: string, network: "MTN" | "AIRTEL"): boolean {
  if (network === "MTN") return validateMTNPhone(phone)
  if (network === "AIRTEL") return validateAirtelPhone(phone)
  return false
}
