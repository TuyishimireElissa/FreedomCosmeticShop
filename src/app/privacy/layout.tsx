import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Privacy Policy | FreedomCosmeticShop', rw: 'Politiki y’Amakuru Bwite | FreedomCosmeticShop' }, // verified-rw
  description: {
    en: 'Learn how FreedomCosmeticShop collects, uses, protects and shares customer information in Rwanda.',
    rw: 'Menya uko FreedomCosmeticShop ikusanya, ikoresha, irinda kandi isangiza amakuru y’abakiriya mu Rwanda.', // verified-rw
  },
  path: '/privacy',
})

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
