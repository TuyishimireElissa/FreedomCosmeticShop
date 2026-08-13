import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

/**
 * /bundles had no metadata of its own, so it inherited the site default and
 * served the identical title and description as the homepage. Both URLs are
 * in the sitemap, so Google was being handed two pages that look like the
 * same page.
 *
 * A layout rather than a page export because bundles/page.tsx is a client
 * component ('use client'), which cannot export `metadata`. Same reason
 * /cart, /faq and /shipping already use layouts.
 *
 * The copy stays deliberately generic about what is on offer: there are
 * currently 0 bundles in the catalogue, so promising "curated routines" or a
 * count would be a claim the page cannot honour the moment a crawler follows
 * it.
 */
export const metadata: Metadata = getPageMetadata({
  title: {
    en: 'Product Bundles | FreedomCosmeticShop',
    rw: 'Amatsinda y’Ibicuruzwa | FreedomCosmeticShop', // verified-rw
  },
  description: {
    en: 'Beauty product bundles from FreedomCosmeticShop — buy matching products together and pay one price. Delivery across Rwanda.',
    rw: 'Amatsinda y’ibicuruzwa by’ubwiza kuri FreedomCosmeticShop — gura ibicuruzwa bijyanye icyarimwe wishyure igiciro kimwe. Tubigeza hose mu Rwanda.', // verified-rw
  },
  path: '/bundles',
})

export default function BundlesLayout({ children }: { children: React.ReactNode }) {
  return children
}
