import type { Metadata } from 'next'
import ContactPageClient from '@/components/contact/ContactPageClient'
import { getPageMetadata } from '@/lib/seo-config'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Contact FreedomCosmeticShop', rw: 'Vugana na FreedomCosmeticShop' }, // verified-rw
  description: {
    en: 'View the currently configured ways to contact FreedomCosmeticShop for product, payment, delivery, return or wholesale questions in Rwanda.',
    rw: 'Reba uburyo bwashyizweho bwo kuvugana na FreedomCosmeticShop ku bibazo by’ibicuruzwa, kwishyura, kubigeza, kubisubiza cyangwa kurangura mu Rwanda.', // verified-rw
  },
  path: '/contact',
})

export default function ContactPage() {
  return <ContactPageClient />
}
