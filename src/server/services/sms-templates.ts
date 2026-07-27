/**
 * SMS Templates — Bilingual (English + Kinyarwanda) message templates.
 *
 * All templates support variable interpolation using {{variable}} syntax.
 * Templates are kept under 160 characters (single SMS segment) where possible.
 *
 * Brand: BUSINESS.tradingName (central owner-managed business identity)
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

import { BUSINESS } from "@/lib/business-config"
import { resolveTranslation } from "@/lib/i18n"

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
    label: resolveTranslation('en', 'sms.order_placed_label'),
    description: resolveTranslation('en', 'sms.order_placed_description'),
    en: resolveTranslation('en', 'sms.order_placed', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.order_placed', { business: BUSINESS.tradingName }),
    variables: ["orderNumber"],
    critical: true,
  },

  PAYMENT_CONFIRMED: {
    key: "PAYMENT_CONFIRMED",
    label: resolveTranslation('en', 'sms.payment_confirmed_label'),
    description: resolveTranslation('en', 'sms.payment_confirmed_description'),
    en: resolveTranslation('en', 'sms.payment_confirmed', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.payment_confirmed', { business: BUSINESS.tradingName }),
    variables: ["orderNumber", "amount"],
    critical: true,
  },

  ORDER_SHIPPED: {
    key: "ORDER_SHIPPED",
    label: resolveTranslation('en', 'sms.order_shipped_label'),
    description: resolveTranslation('en', 'sms.order_shipped_description'),
    en: resolveTranslation('en', 'sms.order_shipped', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.order_shipped', { business: BUSINESS.tradingName }),
    variables: ["orderNumber", "riderName", "riderPhone", "etaDays"],
    critical: true,
  },

  ORDER_DELIVERED: {
    key: "ORDER_DELIVERED",
    label: resolveTranslation('en', 'sms.order_delivered_label'),
    description: resolveTranslation('en', 'sms.order_delivered_description'),
    en: resolveTranslation('en', 'sms.order_delivered', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.order_delivered', { business: BUSINESS.tradingName }),
    variables: ["orderNumber", "reviewLink"],
    critical: false,
  },

  LOW_STOCK: {
    key: "LOW_STOCK",
    label: resolveTranslation('en', 'sms.low_stock_label'),
    description: resolveTranslation('en', 'sms.low_stock_description'),
    en: resolveTranslation('en', 'sms.low_stock', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.low_stock', { business: BUSINESS.tradingName }),
    variables: ["productName", "stockCount"],
    critical: true,
  },

  OTP: {
    key: "OTP",
    label: resolveTranslation('en', 'sms.otp_label'),
    description: resolveTranslation('en', 'sms.otp_description'),
    en: resolveTranslation('en', 'sms.otp', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.otp', { business: BUSINESS.tradingName }),
    variables: ["code"],
    critical: true,
  },

  ABANDONED_CART: {
    key: "ABANDONED_CART",
    label: resolveTranslation('en', 'sms.abandoned_cart_label'),
    description: resolveTranslation('en', 'sms.abandoned_cart_description'),
    en: resolveTranslation('en', 'sms.abandoned_cart', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.abandoned_cart', { business: BUSINESS.tradingName }),
    variables: ["itemCount", "cartLink"],
    critical: false,
  },

  WELCOME: {
    key: "WELCOME",
    label: resolveTranslation('en', 'sms.welcome_label'),
    description: resolveTranslation('en', 'sms.welcome_description'),
    en: resolveTranslation('en', 'sms.welcome', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.welcome', { business: BUSINESS.tradingName }),
    variables: ["customerName"],
    critical: false,
  },

  PROMOTIONAL: {
    key: "PROMOTIONAL",
    label: resolveTranslation('en', 'sms.promotional_label'),
    description: resolveTranslation('en', 'sms.promotional_description'),
    en: resolveTranslation('en', 'sms.promotional', { business: BUSINESS.tradingName }),
    rw: resolveTranslation('rw', 'sms.promotional', { business: BUSINESS.tradingName }),
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
