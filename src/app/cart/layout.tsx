import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Shopping Cart | FreedomCosmeticShop', rw: 'Igitebo cy’Ibyo Ugura | FreedomCosmeticShop' }, // verified-rw
  description: { en: 'Review your current shopping cart.', rw: 'Genzura ibicuruzwa biri mu gitebo cyawe.' }, // verified-rw
  path: '/cart',
  noIndex: true,
})

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
