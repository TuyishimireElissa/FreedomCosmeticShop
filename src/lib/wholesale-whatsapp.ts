import type { Product } from '@/lib/types'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'

export function wholesaleWhatsAppNumber(managerWhatsApp?: string | null) {
  return (managerWhatsApp || WHOLESALE_CONFIG.contacts[0]?.whatsappE164 || '').replace(/\D/g, '')
}

export function buildWholesaleWhatsAppOrder({ product, unitPrice, quantity = 1, managerWhatsApp }: { product: Product; unitPrice: number; quantity?: number; managerWhatsApp?: string | null }) {
  const phone = wholesaleWhatsAppNumber(managerWhatsApp)
  const total = unitPrice * quantity
  const origin = typeof window === 'undefined' ? 'https://freedom-cosmetic-shop.vercel.app' : window.location.origin
  const size = product.volume || product.size || 'N/A'
  const message = [
    'Muraho FreedomCosmeticShop!',
    '',
    'Ndi umukiriya wa wholesale. Nshaka gutuma:',
    '',
    `Igicuruzwa: ${product.name}`,
    `Ingano: ${size}`,
    `Umubare: ${quantity}`,
    `Igiciro cya wholesale: RWF ${unitPrice.toLocaleString('en-US')}`,
    `Igiteranyo: RWF ${total.toLocaleString('en-US')}`,
    '',
    `${origin}/products/${product.slug}`,
    '',
    'Murakoze!',
  ].join('\n')
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
