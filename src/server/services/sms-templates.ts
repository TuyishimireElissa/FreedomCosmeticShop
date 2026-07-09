/**
 * SMS Templates — Bilingual (English + Kinyarwanda) message templates.
 *
 * All templates support variable interpolation using {{variable}} syntax.
 * Templates are kept under 160 characters (single SMS segment) where possible.
 *
 * Brand: "FreedomCosmeticShop" (used in all messages for consistency)
 *
 * Supported variables per template:
 *   - ORDER_PLACED: {orderNumber, customerName?}
 *   - PAYMENT_CONFIRMED: {orderNumber, amount}
 *   - ORDER_SHIPPED: {orderNumber, riderName, riderPhone, etaDays}
 *   - ORDER_DELIVERED: {orderNumber, reviewLink}
 *   - LOW_STOCK: {productName, stockCount}
 *   - OTP: {code}
 *   - ABANDONED_CART: {cartLink, itemCount}
 *   - WELCOME: {customerName}
 *   - PROMOTIONAL: {message, code?}
 */

export type SmsLanguage = "en" | "rw"
export type SmsTemplateKey =
  | "ORDER_PLACED"
  | "PAYMENT_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "LOW_STOCK"
  | "OTP"
  | "ABANDONED_CART"
  | "WELCOME"
  | "PROMOTIONAL"

export interface SmsTemplate {
  key: SmsTemplateKey
  label: string
  description: string
  /** English template */
  en: string
  /** Kinyarwanda template */
  rw: string
  /** Variables this template supports */
  variables: string[]
  /** Whether this template is critical (cannot be opted out) */
  critical: boolean
}

export const SMS_TEMPLATES: Record<SmsTemplateKey, SmsTemplate> = {
  ORDER_PLACED: {
    key: "ORDER_PLACED",
    label: "Order Placed",
    description: "Sent when a customer places an order",
    en: "Thank you! Your order {{orderNumber}} has been received. We'll process it shortly. FreedomCosmeticShop 📦",
    rw: "Murakoze! Itumwa ryawe {{orderNumber}} ryakirwa. Tuzoherekeza vuba. FreedomCosmeticShop 📦",
    variables: ["orderNumber"],
    critical: true,
  },

  PAYMENT_CONFIRMED: {
    key: "PAYMENT_CONFIRMED",
    label: "Payment Confirmed",
    description: "Sent when payment is confirmed (MTN MoMo, Airtel, Card)",
    en: "Payment of {{amount}} RWF confirmed! Order {{orderNumber}} is being prepared. FreedomCosmeticShop ✅",
    rw: "Kwishyura kwawe kwa {{amount}} RWF byagenze neza! Itumwa ryawe {{orderNumber}} riri mu nzira. FreedomCosmeticShop ✅",
    variables: ["orderNumber", "amount"],
    critical: true,
  },

  ORDER_SHIPPED: {
    key: "ORDER_SHIPPED",
    label: "Order Shipped",
    description: "Sent when order is out for delivery",
    en: "Your order {{orderNumber}} is on the way! Rider: {{riderName}} - {{riderPhone}}. ETA: {{etaDays}} days. FreedomCosmeticShop 🏍️",
    rw: "Ibicuruzwa byawe {{orderNumber}} byagiye! Muraza: {{riderName}} - {{riderPhone}}. Uzabibone mu minsi {{etaDays}}. FreedomCosmeticShop 🏍️",
    variables: ["orderNumber", "riderName", "riderPhone", "etaDays"],
    critical: true,
  },

  ORDER_DELIVERED: {
    key: "ORDER_DELIVERED",
    label: "Order Delivered",
    description: "Sent when order is delivered, includes review link",
    en: "Your order {{orderNumber}} has been delivered! Thank you for choosing FreedomCosmeticShop. Review: {{reviewLink}} 🌟",
    rw: "Itumwa ryawe {{orderNumber}} ryarafitiwe! Murakoze guhitamo FreedomCosmeticShop. Tanga igitekerezo: {{reviewLink}} 🌟",
    variables: ["orderNumber", "reviewLink"],
    critical: false,
  },

  LOW_STOCK: {
    key: "LOW_STOCK",
    label: "Low Stock Alert",
    description: "Sent to admin when a product is running low",
    en: "ALERT: {{productName}} has only {{stockCount}} items left! Restock soon. FreedomCosmeticShop Admin",
    rw: "IMENYESHA: {{productName}} isigaye {{stockCount}} gusa! Ongera wugure. FreedomCosmeticShop Admin",
    variables: ["productName", "stockCount"],
    critical: true,
  },

  OTP: {
    key: "OTP",
    label: "OTP Verification",
    description: "Sent for phone verification, login, and password reset",
    en: "FreedomCosmeticShop: Your verification code is {{code}}. Valid for 5 minutes. Do not share it with anyone.",
    rw: "FreedomCosmeticShop: Kod yawe yo kwemeza ni {{code}}. Irahoraho iminota 5. Ntuyisangire n'umwe.",
    variables: ["code"],
    critical: true,
  },

  ABANDONED_CART: {
    key: "ABANDONED_CART",
    label: "Abandoned Cart",
    description: "Sent 2 hours after cart abandonment",
    en: "You left {{itemCount}} item(s) in your cart! Complete your order now: {{cartLink}} FreedomCosmeticShop 🛒",
    rw: "Mutasize ibintu {{itemCount}} mu gitebo cyanyu! Gura none: {{cartLink}} FreedomCosmeticShop 🛒",
    variables: ["itemCount", "cartLink"],
    critical: false,
  },

  WELCOME: {
    key: "WELCOME",
    label: "Welcome",
    description: "Sent when a new customer registers",
    en: "Welcome to FreedomCosmeticShop, {{customerName}}! Enjoy 10% off your first order with code WELCOME10. 🌸",
    rw: "Murakaza neza kuri FreedomCosmeticShop, {{customerName}}! Hema 10% ku gitebo cyawe na kode WELCOME10. 🌸",
    variables: ["customerName"],
    critical: false,
  },

  PROMOTIONAL: {
    key: "PROMOTIONAL",
    label: "Promotional",
    description: "Custom promotional message (opt-out applies)",
    en: "{{message}}{{code ? ' Use code: ' + code : ''}} FreedomCosmeticShop 🌸",
    rw: "{{message}}{{code ? ' Koresha kode: ' + code : ''}} FreedomCosmeticShop 🌸",
    variables: ["message", "code"],
    critical: false,
  },
}

/**
 * Render a template with the given variables.
 *
 * Supports {{variable}} syntax. Unknown variables are replaced with empty string.
 * Supports simple conditionals: {{condition ? 'true text' : 'false text'}}
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template
    .replace(/\{\{(\w+)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}\}/g, (_match, varName, trueText, falseText) => {
      const value = variables[varName]
      return value ? trueText : falseText
    })
    .replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
      const value = variables[varName]
      return value !== undefined ? String(value) : ""
    })
}

/**
 * Get a rendered SMS message for a template key + language.
 *
 * Usage:
 *   const message = getSmsMessage("ORDER_PLACED", "rw", { orderNumber: "UB-2026-00001" })
 */
export function getSmsMessage(
  templateKey: SmsTemplateKey,
  language: SmsLanguage,
  variables: Record<string, string | number | undefined>
): string {
  const template = SMS_TEMPLATES[templateKey]
  if (!template) {
    throw new Error(`Unknown SMS template: ${templateKey}`)
  }
  const raw = language === "rw" ? template.rw : template.en
  return renderTemplate(raw, variables)
}

/**
 * Check if a template is critical (transactional — cannot be opted out).
 */
export function isCriticalTemplate(templateKey: SmsTemplateKey): boolean {
  return SMS_TEMPLATES[templateKey]?.critical ?? false
}

/**
 * Count SMS segments (each 160 chars = 1 segment).
 * Used for cost calculation.
 */
export function countSmsSegments(message: string): number {
  // Unicode messages (with emojis) have 70 chars per segment
  const isUnicode = /[^\x00-\x7F]/.test(message)
  const segmentLength = isUnicode ? 70 : 160
  return Math.ceil(message.length / segmentLength)
}

/**
 * Estimate SMS cost in RWF.
 * Africa's Talking rate: ~6 RWF per segment (approximate).
 */
export function estimateSmsCost(message: string): number {
  const segments = countSmsSegments(message)
  return segments * 6 // 6 RWF per segment
}
