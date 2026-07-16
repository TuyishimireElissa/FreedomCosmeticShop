'use client'

import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useT } from '@/lib/i18n/LanguageContext'
import { QUICK_REPLIES, WA_CONFIG } from '@/lib/whatsapp-service'

const sections = [
  { id: 'payment', title: 'guide_topic_payment', messages: QUICK_REPLIES.payment },
  { id: 'delivery', title: 'guide_topic_delivery', messages: QUICK_REPLIES.delivery },
  { id: 'returns', title: 'guide_topic_returns', messages: QUICK_REPLIES.returns },
  { id: 'authenticity', title: 'guide_topic_authenticity', messages: QUICK_REPLIES.authenticity },
  { id: 'hours', title: 'guide_topic_hours', messages: QUICK_REPLIES.hours },
] as const

export default function WhatsAppAgentGuide() {
  const t = useT()
  const [sectionId, setSectionId] = useState<(typeof sections)[number]['id']>('payment')
  const [language, setLanguage] = useState<'rw' | 'en'>('rw')
  const [copied, setCopied] = useState(false)
  const section = sections.find((item) => item.id === sectionId) || sections[0]
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(section.messages[language])
      setCopied(true); toast.success(t('whatsapp.guide_copied'))
      window.setTimeout(() => setCopied(false), 2000)
    } catch { toast.error(t('whatsapp.guide_copy_failed')) }
  }

  return <main className="mx-auto max-w-5xl"><header><div className="flex items-center gap-2"><MessageCircle className="h-6 w-6 text-green-600" /><h1 className="text-2xl font-black text-gray-900">{t('whatsapp.guide_title')}</h1></div><p className="mt-2 text-sm text-gray-500">{t('whatsapp.guide_subtitle')}</p></header>
    <section className={`mt-5 rounded-2xl border p-4 ${WA_CONFIG.isSupportProfileComplete ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}><h2 className="font-black text-gray-900">{WA_CONFIG.isSupportProfileComplete ? t('whatsapp.guide_setup_complete') : t('whatsapp.guide_setup_required')}</h2><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-gray-500">{t('whatsapp.guide_agent')}</dt><dd className="font-bold">{WA_CONFIG.agentName || t('whatsapp.agent_name_unpublished')}</dd></div><div><dt className="text-gray-500">{t('whatsapp.guide_hours')}</dt><dd className="font-bold">{WA_CONFIG.responseHours.weekdays || t('whatsapp.hours_unpublished')}</dd></div><div><dt className="text-gray-500">{t('whatsapp.guide_response_time')}</dt><dd className="font-bold">{WA_CONFIG.responseHours.responseTime || t('whatsapp.response_time_unpublished')}</dd></div><div><dt className="text-gray-500">{t('whatsapp.guide_number')}</dt><dd className="font-bold">+{WA_CONFIG.number}</dd></div></dl></section>

    <div className="mt-6 grid gap-5 md:grid-cols-[220px_1fr]"><nav className="flex gap-2 overflow-x-auto pb-2 md:block md:space-y-2" aria-label={t('whatsapp.guide_topics')}>{sections.map((item) => <button type="button" key={item.id} onClick={() => setSectionId(item.id)} className={`min-h-11 shrink-0 rounded-xl px-4 text-left text-sm font-bold md:w-full ${sectionId === item.id ? 'bg-[#B76E79] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t(`whatsapp.${item.title}`)}</button>)}</nav>
      <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black text-gray-900">{t(`whatsapp.${section.title}`)}</h2><div className="flex overflow-hidden rounded-xl border"><button type="button" onClick={() => setLanguage('rw')} className={`min-h-11 px-4 text-sm font-bold ${language === 'rw' ? 'bg-[#B76E79] text-white' : 'bg-white text-gray-600'}`}>🇷🇼 RW</button><button type="button" onClick={() => setLanguage('en')} className={`min-h-11 px-4 text-sm font-bold ${language === 'en' ? 'bg-[#B76E79] text-white' : 'bg-white text-gray-600'}`}>EN</button></div></div>
        <div className="mt-3 rounded-2xl bg-gray-50 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-wider text-gray-500">{t('whatsapp.guide_preview')}</span><button type="button" onClick={copy} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-gray-700 shadow-sm">{copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}{copied ? t('whatsapp.guide_copied') : t('whatsapp.guide_copy')}</button></div><pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6 text-gray-700">{section.messages[language]}</pre></div>
        <div className="mt-4 rounded-xl bg-blue-50 p-4"><h3 className="text-sm font-black text-blue-900">{t('whatsapp.guide_usage_title')}</h3><ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-blue-800"><li>{t('whatsapp.guide_usage_verify')}</li><li>{t('whatsapp.guide_usage_order')}</li><li>{t('whatsapp.guide_usage_no_promises')}</li><li>{t('whatsapp.guide_usage_pin')}</li></ul></div>
      </section></div>
  </main>
}
