/**
 * Rwanda phone number formatting and validation.
 *
 * Formats supported:
 *   - 0788123456          (local, 10 digits starting with 0)
 *   - +250788123456       (international, +250 + 9 digits)
 *   - 250788123456        (international without +)
 *   - 0788 123 456        (with spaces)
 *
 * Canonical format: +250788123456
 *
 * Rwanda phone rules:
 *   - Country code: +250
 *   - Mobile numbers start with 07X (where X is 8, 9, 2, or 3)
 *   - After the leading 0: 9 digits total
 *   - MTN: 078X, 079X
 *   - Airtel: 072X, 073X
 */

/** Regex for a valid Rwandan phone in any common format */
export const RWANDA_PHONE_REGEX = /^(?:\+250|250|0)?7[2389][0-9]{7}$/

/**
 * Normalize any Rwandan phone format to canonical +250XXXXXXXXX.
 *
 * Examples:
 *   normalizeRwandaPhone("0788123456")     → "+250788123456"
 *   normalizeRwandaPhone("250788123456")   → "+250788123456"
 *   normalizeRwandaPhone("+250788123456")  → "+250788123456"
 *   normalizeRwandaPhone("0788 123 456")   → "+250788123456"
 *
 * Throws if the phone is not a valid Rwandan number.
 */
export function normalizeRwandaPhone(input: string): string {
  // Strip spaces, dashes, parentheses
  const cleaned = input.replace(/[\s\-()]/g, "")

  if (!RWANDA_PHONE_REGEX.test(cleaned)) {
    throw new PhoneValidationError(
      "Invalid Rwandan phone number. Expected format: 0788123456 or +250788123456"
    )
  }

  // Remove leading +250, 250, or 0, then prepend +250
  const digits = cleaned.replace(/^\+250|^250|^0/, "")
  return `+250${digits}`
}

/**
 * Validate without normalizing. Returns true/false.
 */
export function isValidRwandaPhone(input: string): boolean {
  try {
    normalizeRwandaPhone(input)
    return true
  } catch {
    return false
  }
}

/**
 * Format a canonical +250 phone for display: "+250 788 123 456"
 */
export function formatRwandaPhoneDisplay(phone: string): string {
  const normalized = phone.startsWith("+250")
    ? phone
    : normalizeRwandaPhone(phone)
  // +250788123456 → +250 788 123 456
  const digits = normalized.replace("+250", "")
  return `+250 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

/**
 * Detect the mobile network from a phone number.
 * Returns "MTN" | "AIRTEL" | "UNKNOWN"
 */
export function detectNetwork(phone: string): "MTN" | "AIRTEL" | "UNKNOWN" {
  const normalized = normalizeRwandaPhone(phone)
  const prefix = normalized.slice(4, 6) // "78", "79", "72", "73"
  if (prefix === "78" || prefix === "79") return "MTN"
  if (prefix === "72" || prefix === "73") return "AIRTEL"
  return "UNKNOWN"
}

/** Custom error class for phone validation */
export class PhoneValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PhoneValidationError"
  }
}
