import type { Metadata } from 'next'
import AboutPageClient from '@/components/layout/AboutPageClient'
import StructuredData from '@/components/seo/StructuredData'
import { getPageMetadata } from '@/lib/seo-config'
import { getOrganizationSchema } from '@/lib/structured-data'

export const metadata: Metadata = getPageMetadata({
  title: { en: 'About FreedomCosmeticShop', rw: 'Abo turi bo muri FreedomCosmeticShop' }, // verified-rw
  description: {
    en: 'FreedomCosmeticShop is a Rwandan beauty retailer selling 100% authentic skincare, makeup, haircare and fragrance, delivered to all 30 districts.',
    rw: 'FreedomCosmeticShop ni iduka ry’u Rwanda rigurisha ibicuruzwa by’ubwiza by’umwimerere 100%, bikagezwa mu turere twose 30.', // verified-rw
  },
  path: '/about',
})

export default function AboutPage() {
  return (
    <>
      <StructuredData data={getOrganizationSchema()} />
      <AboutPageClient />
    </>
  )
}
