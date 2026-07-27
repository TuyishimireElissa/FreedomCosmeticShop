import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Delivery Information | FreedomCosmeticShop', rw: 'Amakuru yo Kugeza Ibicuruzwa | FreedomCosmeticShop' }, // verified-rw
  description: {
    en: 'Read current FreedomCosmeticShop delivery information for Kigali and other districts in Rwanda.',
    rw: 'Soma amakuru ariho yo kugeza ibicuruzwa bya FreedomCosmeticShop muri Kigali no mu tundi turere tw’u Rwanda.', // verified-rw
  },
  path: '/shipping',
})

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return children
}
