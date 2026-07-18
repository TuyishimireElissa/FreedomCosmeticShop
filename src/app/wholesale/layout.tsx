import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: {
    en: 'Wholesale Access for Rwanda Businesses | FreedomCosmeticShop',
    rw: 'Kurangura ku Bucuruzi bwo mu Rwanda | FreedomCosmeticShop', // verified-rw
  },
  description: {
    en: 'Rwanda salons, shops, spas and resellers can apply to view configured product-specific wholesale prices. Unconfigured discounts or credit are not promised.',
    rw: 'Salon, amaduka, spa n’abacuruzi bo mu Rwanda bashobora gusaba kureba ibiciro byo kurangura byashyizweho kuri buri gicuruzwa. Ntidusezeranya igabanyirizwa cyangwa inguzanyo bitashyizweho.', // verified-rw
  },
  path: '/wholesale',
})

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return children
}
