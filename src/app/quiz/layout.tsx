import type { Metadata } from 'next'
import { getPageMetadata } from '@/lib/seo-config'

/**
 * /quiz inherited the site default title and description. It is in the
 * sitemap, so Google had two indexed URLs claiming to be the same page.
 *
 * A layout, not a page export: quiz/page.tsx renders a client component.
 *
 * THE COPY IS CAREFUL ON PURPOSE. The quiz filters on `ingredients` and
 * `howToUse`, which are populated on 105 and 0 of 106 products respectively,
 * so it can return little today. The description therefore promises a way to
 * narrow the catalogue by skin type — which the data does support, 22
 * products carry skinType and the filter works — rather than "personalised
 * recommendations", which it cannot currently deliver.
 */
export const metadata: Metadata = getPageMetadata({
  title: {
    en: 'Find Products for Your Skin | FreedomCosmeticShop',
    rw: 'Shakisha Ibikwiye Uruhu Rwawe | FreedomCosmeticShop', // verified-rw
  },
  description: {
    en: 'Answer a few questions about your skin and see FreedomCosmeticShop products that match, with prices in RWF and delivery across Rwanda.',
    rw: 'Subiza ibibazo bike ku ruhu rwawe urebe ibicuruzwa bya FreedomCosmeticShop bikubereye, n’ibiciro mu RWF, tubigeza hose mu Rwanda.', // verified-rw
  },
  path: '/quiz',
})

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children
}
