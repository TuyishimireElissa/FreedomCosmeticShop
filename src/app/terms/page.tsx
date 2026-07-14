'use client'

import InformationPage from '@/components/layout/InformationPage'
import { BUSINESS } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

export default function TermsPage() {
  const t = useT()
  return <InformationPage eyebrow={t('pages.legal')} title={t('pages.terms_title')} intro={t('pages.terms_intro', { business: BUSINESS.tradingName })} sections={[
    { title: t('pages.orders_pricing'), bullets: [t('pages.prices_rwf'), t('pages.order_confirmation_terms'), t('pages.order_cancellation_terms')] },
    { title: t('pages.payments'), paragraphs: [t('pages.payments_text', { business: BUSINESS.tradingName })] },
    { title: t('pages.delivery'), paragraphs: [t('pages.delivery_terms_text')] },
    { title: t('pages.products'), paragraphs: [t('pages.products_terms_text')] },
    { title: t('pages.acceptable_use'), bullets: [t('pages.use_no_unauthorized'), t('pages.use_no_false_reviews'), t('pages.use_suspension')] },
    { title: t('pages.liability_law'), paragraphs: [t('pages.liability_law_text')] },
  ]} />
}
