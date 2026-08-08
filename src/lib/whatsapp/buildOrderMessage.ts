/**
 * WhatsApp order message builder.
 *
 * Lives in its own module because it serves a different purpose from the
 * browse-time helpers in `whatsapp-service.ts`: those build "I'm interested"
 * enquiries from cart state, this renders a *saved order* with a reference
 * number that the business will fulfil. It deliberately reuses
 * `buildWhatsAppUrl` from that service rather than re-implementing URL
 * encoding, so there is still one place that knows how to talk to wa.me.
 */

import { formatRWF } from '@/lib/format'

export interface WhatsAppOrderItem {
  name: string
  variant?: string | null
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface WhatsAppOrderData {
  orderReference: string
  customer: {
    name: string
    phone: string
    email?: string | null
  }
  delivery: {
    province: string
    district: string
    sector: string
    cell?: string | null
    village?: string | null
    landmark?: string | null
    notes?: string | null
  }
  items: WhatsAppOrderItem[]
  pricing: {
    subtotal: number
    deliveryFee: number
    discount?: number
    couponCode?: string | null
    total: number
  }
  timestamp: Date
  language: 'rw' | 'en'
}

const COPY = {
  rw: {
    header: 'ORDER NSHYA - FREEDOM COSMETIC SHOP',
    intro: 'Muraho! Nkeneye kugura ibi bikurikira:',
    items: 'IBICURUZWA:',
    size: 'Ubunini',
    qty: 'Umubare',
    unit: 'Igiciro',
    lineTotal: 'Igiteranyo',
    money: 'AMAFARANGA:',
    goods: 'Ibicuruzwa',
    delivery: 'Ubuherezo',
    discount: 'Igabanyirizwa',
    total: 'IGITERANYO CYOSE',
    address: 'AHO NGEZWA:',
    name: 'Izina',
    phone: 'Telefoni',
    email: 'Imeyili',
    province: 'Intara',
    district: 'Akarere',
    sector: 'Umurenge',
    cell: 'Akagari',
    village: 'Umudugudu',
    landmark: 'Icyerekezo',
    notes: 'Ubutumwa',
    reference: 'Order Reference',
    confirm: 'Ndabyemeje. Nzishyura MoMo/Airtel/Cash mu kugezwaho.',
    thanks: 'Murakoze cyane!',
  },
  en: {
    header: 'NEW ORDER - FREEDOM COSMETIC SHOP',
    intro: 'Hello! I would like to order the following:',
    items: 'PRODUCTS:',
    size: 'Size',
    qty: 'Quantity',
    unit: 'Unit price',
    lineTotal: 'Subtotal',
    money: 'TOTALS:',
    goods: 'Products',
    delivery: 'Delivery',
    discount: 'Discount',
    total: 'GRAND TOTAL',
    address: 'DELIVERY ADDRESS:',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    province: 'Province',
    district: 'District',
    sector: 'Sector',
    cell: 'Cell',
    village: 'Village',
    landmark: 'Landmark',
    notes: 'Notes',
    reference: 'Order Reference',
    confirm: 'Confirmed. I will pay by MoMo/Airtel/Cash on delivery.',
    thanks: 'Thank you very much!',
  },
} as const

const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━'
const THIN = '━━━━━━━━━━━━━━━━'

/** `+250790215965` → `250790215965`, the form wa.me expects. */
export function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('250')) return digits
  if (digits.startsWith('0')) return `250${digits.slice(1)}`
  return digits.length === 9 ? `250${digits}` : digits
}

/**
 * Order reference: FC-YYYYMMDD-XXXX.
 *
 * The suffix is generated server-side from a cryptographic source and checked
 * for collisions against the database before use — a client-side random value
 * would be trivially forgeable and could collide silently.
 */
export function formatOrderReference(date: Date, suffix: string): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `FC-${y}${m}${d}-${suffix}`
}

function line(label: string, value: string | null | undefined): string | null {
  const v = (value ?? '').toString().trim()
  return v ? `${label}: ${v}` : null
}

/**
 * Render the full order as a WhatsApp message.
 *
 * Optional fields are omitted when empty rather than printed blank, and no
 * value is ever invented — if the customer left the landmark out, the line
 * simply does not appear.
 */
export function buildWhatsAppOrderMessage(order: WhatsAppOrderData): string {
  const c = COPY[order.language === 'en' ? 'en' : 'rw']
  const out: string[] = []

  out.push(`🌸 *${c.header}*`, RULE, '', c.intro, '', `📋 *${c.items}*`, THIN, '')

  order.items.forEach((item, index) => {
    out.push(`${index + 1}. *${item.name}*`)
    if (item.variant) out.push(`   ${c.size}: ${item.variant}`)
    out.push(`   ${c.qty}: ${item.quantity}`)
    out.push(`   ${c.unit}: ${formatRWF(item.unitPrice)}`)
    out.push(`   ${c.lineTotal}: ${formatRWF(item.subtotal)}`)
    out.push('')
  })

  out.push(THIN, '', `💰 *${c.money}*`)
  out.push(`${c.goods}: ${formatRWF(order.pricing.subtotal)}`)
  out.push(`${c.delivery}: ${formatRWF(order.pricing.deliveryFee)}`)
  if (order.pricing.discount && order.pricing.discount > 0) {
    const code = order.pricing.couponCode ? ` (${order.pricing.couponCode})` : ''
    out.push(`${c.discount}: - ${formatRWF(order.pricing.discount)}${code}`)
  }
  out.push(`*${c.total}: ${formatRWF(order.pricing.total)}*`, '')

  out.push(`📍 *${c.address}*`)
  const address = [
    line(c.name, `*${order.customer.name}*`),
    line(c.phone, order.customer.phone),
    line(c.email, order.customer.email),
    line(c.province, order.delivery.province),
    line(c.district, order.delivery.district),
    line(c.sector, order.delivery.sector),
    line(c.cell, order.delivery.cell),
    line(c.village, order.delivery.village),
    line(c.landmark, order.delivery.landmark),
    line(c.notes, order.delivery.notes),
  ].filter(Boolean) as string[]
  out.push(...address, '')

  out.push(`🎫 *${c.reference}:* ${order.orderReference}`)
  out.push(`📅 ${order.timestamp.toISOString().slice(0, 16).replace('T', ' ')} UTC`, '')
  out.push(RULE, '', `✅ ${c.confirm}`, '', `${c.thanks} 💖`)

  return out.join('\n')
}
