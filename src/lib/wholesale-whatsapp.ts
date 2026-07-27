import type { Product } from '@/lib/types'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'

export type WholesaleCartLanguage = 'en' | 'rw'

export interface WholesaleCartOrderItem {
  name: string
  price: number
  quantity: number
  volume?: string | null
}

export function wholesaleWhatsAppNumber(managerWhatsApp?: string | null) {
  return (managerWhatsApp || WHOLESALE_CONFIG.contacts[0]?.whatsappE164 || '').replace(/\D/g, '')
}

export function buildWholesaleCartOrderMessage({
  items,
  language = 'en',
}: {
  items: WholesaleCartOrderItem[]
  language?: WholesaleCartLanguage
}) {
  const itemLines = items.map((item, index) => {
    const volume = item.volume?.trim() ? ` (${item.volume.trim()})` : ''
    const lineTotal = Number(item.price) * Number(item.quantity)
    return `${index + 1}. *${item.name}*${volume} x ${item.quantity} - RWF ${lineTotal.toLocaleString('en-US')}`
  }).join('\n')
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)

  if (language === 'rw') {
    return [
      'Muraho FreedomCosmeticShop,',
      '',
      'Nshaka gutuma ibi bicuruzwa:',
      '',
      itemLines,
      '',
      `*Igiteranyo: RWF ${subtotal.toLocaleString('en-US')}*`,
      `*Igiteranyo Cyose: RWF ${subtotal.toLocaleString('en-US')}*`,
      '',
      'Nyamuneka munyoherereze.',
    ].join('\n')
  }

  return [
    'Hello FreedomCosmeticShop,',
    '',
    'I want to order the following items:',
    '',
    itemLines,
    '',
    `*Subtotal: RWF ${subtotal.toLocaleString('en-US')}*`,
    `*Grand Total: RWF ${subtotal.toLocaleString('en-US')}*`,
    '',
    'Please arrange delivery to my location.',
  ].join('\n')
}

export function buildWholesaleCartWhatsAppOrder({
  items,
  language = 'en',
  managerWhatsApp,
}: {
  items: WholesaleCartOrderItem[]
  language?: WholesaleCartLanguage
  managerWhatsApp?: string | null
}) {
  const phone = wholesaleWhatsAppNumber(managerWhatsApp)
  const message = buildWholesaleCartOrderMessage({ items, language })
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/** Retained for non-cart support links; wholesale product ordering now uses the shared cart. */
export function buildWholesaleWhatsAppOrder({ product, unitPrice, quantity = 1, managerWhatsApp }: { product: Product; unitPrice: number; quantity?: number; managerWhatsApp?: string | null }) {
  return buildWholesaleCartWhatsAppOrder({
    items: [{ name: product.name, volume: product.volume || product.size, price: unitPrice, quantity }],
    language: 'rw',
    managerWhatsApp,
  })
}
