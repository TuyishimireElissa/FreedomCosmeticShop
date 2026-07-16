/**
 * FreedomCosmeticShop assisted-selling message service.
 * Generates validated Kinyarwanda-default and English WhatsApp messages.
 * It never supplies placeholder staff names, response times, or business hours.
 */

import { BUSINESS } from '@/lib/business-config'
import { DELIVERY_FEES, formatRWF } from '@/lib/format'
import { resolveTranslation } from '@/lib/i18n'

export type WhatsAppLanguage = 'rw' | 'en'
export type WAEventType =
  | 'order_product'
  | 'order_cart'
  | 'product_inquiry'
  | 'delivery_inquiry'
  | 'payment_help'
  | 'returns_inquiry'
  | 'authenticity_check'
  | 'general_support'
  | 'track_order'
  | 'wholesale_inquiry'
  | 'share_product'
  | 'share_cart'

type Bilingual = Readonly<{ rw: string; en: string }>
const configuredValue = (value: string | undefined) => {
  const cleaned = value?.trim()
  return cleaned && !cleaned.includes('TODO:') ? cleaned : null
}
const whatsappNumber = BUSINESS.whatsapp.replace(/\D/g, '')

export const WA_CONFIG = {
  number: /^2507[2389]\d{7}$/.test(whatsappNumber) ? whatsappNumber : null,
  agentName: configuredValue(process.env.NEXT_PUBLIC_WA_AGENT_NAME),
  responseHours: {
    weekdays: configuredValue(process.env.NEXT_PUBLIC_WA_HOURS_WEEKDAYS),
    saturday: configuredValue(process.env.NEXT_PUBLIC_WA_HOURS_SATURDAY),
    sunday: configuredValue(process.env.NEXT_PUBLIC_WA_HOURS_SUNDAY),
    timezone: 'Africa/Kigali',
    responseTime: configuredValue(process.env.NEXT_PUBLIC_WA_RESPONSE_TIME),
  },
  isBusinessAccount: process.env.NEXT_PUBLIC_WA_BUSINESS_ACCOUNT === 'true',
  isNumberConfigured: /^2507[2389]\d{7}$/.test(whatsappNumber),
  isSupportProfileComplete: Boolean(
    configuredValue(process.env.NEXT_PUBLIC_WA_AGENT_NAME)
    && configuredValue(process.env.NEXT_PUBLIC_WA_HOURS_WEEKDAYS)
    && configuredValue(process.env.NEXT_PUBLIC_WA_RESPONSE_TIME),
  ),
} as const

export interface ProductOrderData {
  productName: string
  productNameRw?: string
  productUrl: string
  price: number
  quantity: number
  shade?: string
  size?: string
  district?: string
  totalRWF: number
  language?: WhatsAppLanguage
}
export interface CartOrderData {
  items: Array<{
    name: string
    nameRw?: string
    quantity: number
    price: number
    shade?: string
    size?: string
    productUrl: string
  }>
  subtotal: number
  discount?: number
  district?: string
  deliveryFee?: number
  totalRWF: number
  language?: WhatsAppLanguage
  storeUrl: string
}

function t(language: WhatsAppLanguage, key: string, variables: Record<string, string | number> = {}) {
  return resolveTranslation(language, `whatsapp.${key}`, variables)
}
function requiredText(value: string, field: string) {
  const cleaned = value.trim()
  if (!cleaned) throw new Error(`WhatsApp message requires ${field}`)
  return cleaned
}
function money(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`WhatsApp message requires a valid ${field}`)
  return value
}
function quantity(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 99) throw new Error('WhatsApp message requires a valid quantity')
  return value
}
function absoluteUrl(value: string, field: string) {
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`WhatsApp message requires a valid ${field}`)
  return parsed.toString()
}

export function buildProductOrderMessage(data: ProductOrderData): string {
  const language = data.language || 'rw'
  const productName = requiredText(language === 'rw' && data.productNameRw ? data.productNameRw : data.productName, 'product name')
  const unitPrice = money(data.price, 'product price')
  const count = quantity(data.quantity)
  const exactTotal = money(data.totalRWF, 'product total')
  if (exactTotal !== unitPrice * count) throw new Error('WhatsApp product total does not match price and quantity')
  const url = absoluteUrl(data.productUrl, 'product URL')
  const lines = [
    t(language, 'message_greeting'),
    '',
    t(language, 'product_order_intro'),
    '',
    t(language, 'message_product', { name: productName }),
  ]
  if (data.shade) lines.push(t(language, 'message_shade', { shade: requiredText(data.shade, 'shade') }))
  if (data.size) lines.push(t(language, 'message_size', { size: requiredText(data.size, 'size') }))
  lines.push(t(language, 'message_quantity', { count }))
  lines.push(t(language, 'message_unit_price', { amount: formatRWF(unitPrice) }))
  lines.push(t(language, 'message_total', { amount: formatRWF(exactTotal) }))
  if (data.district) lines.push(t(language, 'message_district', { district: requiredText(data.district, 'district') }))
  lines.push(t(language, 'message_link', { url }))
  lines.push('', t(language, 'product_order_close'))
  return lines.join('\n')
}

export function buildCartOrderMessage(data: CartOrderData): string {
  const language = data.language || 'rw'
  if (!data.items.length) throw new Error('WhatsApp cart message requires at least one item')
  absoluteUrl(data.storeUrl, 'store URL')
  let calculatedSubtotal = 0
  const itemLines = data.items.flatMap((item, index) => {
    const name = requiredText(language === 'rw' && item.nameRw ? item.nameRw : item.name, 'product name')
    const count = quantity(item.quantity)
    const price = money(item.price, 'item price')
    calculatedSubtotal += price * count
    const lines = [t(language, 'cart_item', { number: index + 1, name })]
    if (item.shade) lines.push(t(language, 'message_shade', { shade: requiredText(item.shade, 'shade') }))
    if (item.size) lines.push(t(language, 'message_size', { size: requiredText(item.size, 'size') }))
    lines.push(t(language, 'message_line_total', { count, amount: formatRWF(price * count) }))
    lines.push(t(language, 'message_link', { url: absoluteUrl(item.productUrl, 'product URL') }))
    return [...lines, '']
  })
  const subtotal = money(data.subtotal, 'subtotal')
  if (subtotal !== calculatedSubtotal) throw new Error('WhatsApp cart subtotal does not match item prices')
  const discount = money(data.discount || 0, 'discount')
  const delivery = data.deliveryFee === undefined ? 0 : money(data.deliveryFee, 'delivery fee')
  const total = money(data.totalRWF, 'cart total')
  if (total !== Math.max(0, subtotal - discount + delivery)) throw new Error('WhatsApp cart total does not match subtotal, discount, and delivery')
  const lines = [t(language, 'message_greeting'), '', t(language, 'cart_order_intro'), '', ...itemLines]
  lines.push(t(language, 'message_subtotal', { amount: formatRWF(subtotal) }))
  if (discount > 0) lines.push(t(language, 'message_discount', { amount: formatRWF(discount) }))
  if (data.deliveryFee !== undefined) lines.push(t(language, 'message_delivery', { amount: delivery === 0 ? t(language, 'free') : formatRWF(delivery) }))
  lines.push(t(language, 'message_total', { amount: formatRWF(total) }))
  if (data.district) lines.push(t(language, 'message_district', { district: requiredText(data.district, 'district') }))
  lines.push('', t(language, 'cart_order_close'))
  return lines.join('\n')
}

const reply = (key: string, variables: Record<string, string | number> = {}): Bilingual => ({
  rw: t('rw', key, variables),
  en: t('en', key, variables),
})
export const QUICK_REPLIES = {
  payment: reply('quick_payment'),
  delivery: reply('quick_delivery', {
    kigali: formatRWF(DELIVERY_FEES['Kigali City']),
    northSouth: formatRWF(DELIVERY_FEES['Northern Province']),
    east: formatRWF(DELIVERY_FEES['Eastern Province']),
    west: formatRWF(DELIVERY_FEES['Western Province']),
    threshold: formatRWF(BUSINESS.policies.freeDeliveryThreshold),
    cutoff: BUSINESS.policies.sameDayCutoff,
  }),
  returns: reply('quick_returns', { days: BUSINESS.policies.returnDays }),
  authenticity: reply('quick_authenticity'),
  hours: WA_CONFIG.isSupportProfileComplete
    ? reply('quick_hours_configured', { hours: WA_CONFIG.responseHours.weekdays!, responseTime: WA_CONFIG.responseHours.responseTime! })
    : reply('quick_hours_unconfigured'),
} as const

export class WhatsAppConfigurationError extends Error {
  constructor() { super('Verified WhatsApp number is not configured'); this.name = 'WhatsAppConfigurationError' }
}
function isDesktopWhatsApp() { return typeof navigator !== 'undefined' && !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) }
export function buildWhatsAppUrl(message: string): string {
  if (!WA_CONFIG.number) throw new WhatsAppConfigurationError()
  const text = encodeURIComponent(requiredText(message, 'message'))
  return isDesktopWhatsApp()
    ? `https://web.whatsapp.com/send?phone=${WA_CONFIG.number}&text=${text}`
    : `https://wa.me/${WA_CONFIG.number}?text=${text}`
}
export function buildWhatsAppShareUrl(message: string): string {
  const text = encodeURIComponent(requiredText(message, 'message'))
  return isDesktopWhatsApp() ? `https://web.whatsapp.com/send?text=${text}` : `https://wa.me/?text=${text}`
}

export interface WAAnalyticsMetadata {
  productId?: string
  productSlug?: string
  cartTotal?: number
  district?: string
  language?: WhatsAppLanguage
  pagePath?: string
}
export function trackWhatsAppClick(eventType: WAEventType, metadata: WAAnalyticsMetadata = {}): void {
  const payload = {
    eventType,
    productId: metadata.productId?.slice(0, 100),
    productSlug: metadata.productSlug?.slice(0, 160),
    cartTotal: Number.isSafeInteger(metadata.cartTotal) && (metadata.cartTotal || 0) >= 0 ? metadata.cartTotal : undefined,
    district: metadata.district?.slice(0, 80),
    language: metadata.language === 'en' ? 'en' : 'rw',
    pagePath: metadata.pagePath?.split('?')[0].split('#')[0].slice(0, 300),
  }
  void fetch('/api/analytics/whatsapp-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}
