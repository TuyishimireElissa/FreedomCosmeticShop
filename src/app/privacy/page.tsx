'use client'

import InformationPage from '@/components/layout/InformationPage'
import { BUSINESS } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

export default function PrivacyPage() {
  const t = useT()
  return <InformationPage eyebrow={t('pages.your_privacy')} title={t('pages.privacy_title')} intro={t('pages.privacy_intro', { business: BUSINESS.tradingName })} sections={[
    { title: t('pages.info_collect'), bullets: [t('pages.collect_identity'), t('pages.collect_delivery'), t('pages.collect_payment'), t('pages.collect_device')] },
    { title: t('pages.info_use'), bullets: [t('pages.use_process'), t('pages.use_protect'), t('pages.use_notifications'), t('pages.use_improve')] },
    { title: t('pages.sharing'), paragraphs: [t('pages.sharing_text')] },
    { title: t('pages.retention_security'), paragraphs: [t('pages.retention_security_text')] },
    { title: t('pages.your_choices'), bullets: [t('pages.choice_access'), t('pages.choice_opt_out'), t('pages.choice_delete'), t('pages.choice_contact')] },
    { title: t('pages.cookies'), paragraphs: [t('pages.cookies_text')] },
  ]} />
}
