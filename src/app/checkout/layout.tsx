import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Checkout | FreedomCosmeticShop', rw: 'Kwishyura | FreedomCosmeticShop' }, // verified-rw
  description: { en: 'Complete your FreedomCosmeticShop order.', rw: 'Rangiza komande yawe ya FreedomCosmeticShop.' }, // verified-rw
  path: '/checkout',
  noIndex: true,
})

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
