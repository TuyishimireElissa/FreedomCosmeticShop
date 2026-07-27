'use client'

import InformationPage from '@/components/layout/InformationPage'
import { BUSINESS } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

export default function ShippingPage() {
  const t = useT()
  return <InformationPage eyebrow={t('pages.nationwide_delivery')} title={t('pages.shipping_title')} intro={t('pages.shipping_intro', { business: BUSINESS.tradingName, country: BUSINESS.address.country })} sections={[
    { title: t('pages.delivery_fees'), bullets: [t('pages.fee_kigali'), t('pages.fee_north_south'), t('pages.fee_east'), t('pages.fee_west'), t('pages.free_standard_delivery', { amount: BUSINESS.policies.freeDeliveryThreshold.toLocaleString('en-RW') })] },
    { title: t('pages.estimated_times'), bullets: [t('pages.time_kigali', { cutoff: BUSINESS.policies.sameDayCutoff }), t('pages.time_north_south_east'), t('pages.time_west')] },
    { title: t('pages.address_requirements'), paragraphs: [t('pages.address_requirements_text')] },
    { title: t('pages.delivery_confirmation'), paragraphs: [t('pages.delivery_confirmation_text')] },
    { title: t('pages.delays'), paragraphs: [t('pages.delays_text')] },
  ]} />
}
