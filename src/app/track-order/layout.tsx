import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

/**
 * /track-order inherited the site default title and description, so it was
 * indistinguishable from the homepage in a search result — on the one page a
 * worried customer is actively searching for by name.
 *
 * A layout, not a page export: track-order/page.tsx renders a client
 * component.
 *
 * `noIndex` is deliberate. This page is a lookup form that needs an order
 * number and the matching phone number; it has no content worth ranking, and
 * every real URL a customer lands on carries their order reference. It is
 * already absent from the sitemap — verified live — so this makes the two
 * agree instead of leaving the page half-advertised.
 */
export const metadata: Metadata = getPageMetadata({
  title: {
    en: 'Track Your Order | FreedomCosmeticShop',
    rw: 'Kurikirana Icyo Watumije | FreedomCosmeticShop', // verified-rw
  },
  description: {
    en: 'Check the status of your FreedomCosmeticShop order using your order number and the phone number you ordered with.',
    rw: 'Reba aho icyo watumije kuri FreedomCosmeticShop kigeze ukoresheje nimero y’itumiza na nimero ya telefoni watumirijeho.', // verified-rw
  },
  path: '/track-order',
  noIndex: true,
})

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
