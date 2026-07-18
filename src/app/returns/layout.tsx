import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Returns and Refunds | FreedomCosmeticShop', rw: 'Gusubiza Ibicuruzwa n’Amafaranga | FreedomCosmeticShop' }, // verified-rw
  description: {
    en: 'Read the current eligibility and process for returning FreedomCosmeticShop purchases in Rwanda.',
    rw: 'Soma ibisabwa n’uburyo bwo gusubiza ibicuruzwa byaguzwe kuri FreedomCosmeticShop mu Rwanda.', // verified-rw
  },
  path: '/returns',
})

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return children
}
