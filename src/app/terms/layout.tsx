import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Terms and Conditions | FreedomCosmeticShop', rw: 'Amabwiriza n’Amategeko | FreedomCosmeticShop' }, // verified-rw
  description: {
    en: 'Read the terms governing purchases and use of FreedomCosmeticShop in Rwanda.',
    rw: 'Soma amabwiriza agenga kugura no gukoresha FreedomCosmeticShop mu Rwanda.', // verified-rw
  },
  path: '/terms',
})

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
