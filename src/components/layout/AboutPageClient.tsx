'use client'

import InformationPage from '@/components/layout/InformationPage'
import { BUSINESS } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

export default function AboutPageClient() {
  const t = useT()
  return (
    <InformationPage
      eyebrow={t('pages.about_eyebrow')}
      title={t('pages.about_title')}
      intro={t('pages.about_intro', { business: BUSINESS.tradingName, country: BUSINESS.address.country })}
      sections={[
        { title: t('pages.about_who_we_are'), paragraphs: [t('pages.about_who_we_are_text')] },
        { title: t('pages.about_authenticity'), paragraphs: [t('pages.about_authenticity_text')] },
        {
          title: t('pages.about_what_we_sell'),
          bullets: [
            t('pages.about_sell_skincare'),
            t('pages.about_sell_makeup'),
            t('pages.about_sell_haircare'),
            t('pages.about_sell_fragrance'),
          ],
        },
        { title: t('pages.about_delivery'), paragraphs: [t('pages.about_delivery_text')] },
        { title: t('pages.about_wholesale'), paragraphs: [t('pages.about_wholesale_text')] },
        { title: t('pages.about_contact_us'), paragraphs: [t('pages.about_contact_us_text')] },
      ]}
    />
  )
}
