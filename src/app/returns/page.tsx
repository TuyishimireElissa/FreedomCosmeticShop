'use client'

import InformationPage from '@/components/layout/InformationPage'
import { BUSINESS } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

export default function ReturnsPage() {
  const t = useT()
  return <InformationPage eyebrow={t('pages.customer_care')} title={t('pages.returns_title')} intro={t('pages.returns_intro')} sections={[
    { title: t('pages.return_window'), paragraphs: [t('pages.return_window_text', { days: BUSINESS.policies.returnDays })] },
    { title: t('pages.return_excluded'), bullets: [t('pages.return_excluded_opened'), t('pages.return_excluded_damaged'), t('pages.return_excluded_clearance'), t('pages.return_excluded_proof')] },
    { title: t('pages.damaged_incorrect'), paragraphs: [t('pages.damaged_incorrect_text')] },
    { title: t('pages.refund_timing'), paragraphs: [t('pages.refund_timing_text')] },
    { title: t('pages.return_request'), bullets: [t('pages.return_contact_first'), t('pages.return_provide_order'), t('pages.return_wait_instructions'), t('pages.return_package_securely')] },
  ]} />
}
