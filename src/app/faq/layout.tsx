import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Frequently Asked Questions | FreedomCosmeticShop', rw: 'Ibibazo Bikunze Kubazwa | FreedomCosmeticShop' }, // verified-rw
  description: {
    en: 'Answers about FreedomCosmeticShop products, payments, delivery, order tracking, returns and wholesale access in Rwanda.',
    rw: 'Ibisubizo ku bicuruzwa, kwishyura, kubigeza, gukurikirana komande, gusubiza no kurangura kuri FreedomCosmeticShop mu Rwanda.', // verified-rw
  },
  path: '/faq',
})

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children
}
