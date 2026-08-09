/**
 * Admin-side "Copy Order Message" formatter.
 *
 * Distinct from `buildOrderMessage.ts`, which renders the message the CUSTOMER
 * sends to the shop at checkout. This renders the message the SHOP sends back
 * to the customer to acknowledge an order, so it is addressed to them, written
 * in the second person, and signed with the business number.
 *
 * Two deliberate constraints:
 *  - No response-time promise. "We will contact you to confirm delivery" says
 *    what will happen without claiming when, because no SLA exists to back a
 *    speed claim.
 *  - The business number is read from config, never hard-coded, so changing
 *    the shop number is a one-line edit in `business-config.ts`.
 */

import { BUSINESS } from '@/lib/business-config'
import { formatRWF } from '@/lib/format'

export interface FollowUpItem {
  name: string
  quantity: number
  price: number
}

export interface FollowUpOrder {
  orderNumber: string
  customerName: string
  address?: string | null
  district?: string | null
  sector?: string | null
  items: FollowUpItem[]
  total: number
  language?: 'rw' | 'en'
}

const COPY = {
  rw: {
    greeting: (name: string) => `Muraho ${name},`,
    thanks: (ref: string) => `Murakoze kugura kuri Freedom Cosmetic Shop! Order yanyu ni #${ref} 🌸`,
    details: 'Ibyo mwatumije:',
    total: 'Igiteranyo',
    delivery: 'Aho tuzabigeza',
    // No time claim — states what happens, not how fast. // verified-rw
    contact: 'Tuzabahamagara kugira ngo twemeze aho tuzabigeza.',
  },
  en: {
    greeting: (name: string) => `Hello ${name},`,
    thanks: (ref: string) => `Thank you for your order #${ref} from Freedom Cosmetic Shop! 🌸`,
    details: 'Order Details:',
    total: 'Total',
    delivery: 'Delivery',
    contact: 'We will contact you to confirm delivery.',
  },
} as const

/**
 * Render the follow-up message.
 *
 * Empty optional fields are omitted rather than printed blank — an order with
 * no district must not produce a dangling "Delivery:" line.
 */
export function buildFollowUpMessage(order: FollowUpOrder): string {
  const c = COPY[order.language === 'rw' ? 'rw' : 'en']
  const out: string[] = []

  out.push(c.greeting(order.customerName.trim()), '')
  out.push(c.thanks(order.orderNumber), '')
  out.push(`*${c.details}*`)

  for (const item of order.items) {
    out.push(`${item.name} x${item.quantity} — ${formatRWF(item.price * item.quantity)}`)
  }

  out.push('', `*${c.total}:* ${formatRWF(order.total)}`)

  const where = [order.address, order.sector, order.district]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ')
  if (where) out.push(`*${c.delivery}:* ${where}`)

  out.push('', c.contact, '', 'Freedom Cosmetic Shop')

  // Read from config so the shop number lives in exactly one place. Guarded in
  // case the owner placeholder is ever reintroduced — a literal
  // "[TODO: OWNER_MUST_ADD_THIS...]" must never reach a customer.
  const phone = BUSINESS.whatsapp
  if (phone && !phone.includes('TODO')) out.push(phone)

  return out.join('\n')
}
