import { formatRWF } from '@/lib/format'

/**
 * Product share text for WhatsApp (Phase 5).
 *
 * Pure module: the product detail page builds its share link here, so the
 * strings are unit-testable and stay in one place.
 *
 * The owner-authored `whatsappShareText` field wins when present — it is
 * ready-to-share promotion copy and is used exactly as written. When it is
 * empty the module falls back to the same bilingual template the Quick View
 * has used since before Phase 5 (name, price in RWF, product URL).
 */

const SHOP_NAME = 'FreedomCosmeticShop'

export interface ProductShareInfo {
  name: string
  slug: string
  price: number
  whatsappShareText?: string | null
}

function productUrl(origin: string, slug: string) {
  const base = origin.replace(/\/+$/, '')
  return `${base}/products/${encodeURIComponent(slug)}`
}

export function buildProductShareText(
  product: ProductShareInfo,
  isRW: boolean,
  origin: string,
): string {
  const authored = product.whatsappShareText?.trim()
  if (authored) return authored

  const url = productUrl(origin, product.slug)
  return isRW
    ? `Reba ${product.name} kuri ${SHOP_NAME} — ${formatRWF(product.price)}\n${url}`
    : `View ${product.name} at ${SHOP_NAME} — ${formatRWF(product.price)}\n${url}`
}

/** wa.me without a phone number opens the "share with…" picker. */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
