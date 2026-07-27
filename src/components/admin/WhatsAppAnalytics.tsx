'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface WAStats {
  totalClicks: number
  byType: Array<{ eventType: string; count: number }>
  byLanguage: Array<{ language: string; count: number }>
  byDay: Array<{ date: string; count: number }>
  topProducts: Array<{ productId: string; productName: string; productSlug: string; count: number }>
}

export default function WhatsAppAnalytics() {
  const t = useT()
  const [stats, setStats] = useState<WAStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/analytics/whatsapp', { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => setStats(result.data || null))
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setFailed(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
  if (failed || !stats) return <section className="rounded-2xl border border-dashed p-6 text-center text-sm text-gray-500">{t('whatsapp.analytics_load_failed')}</section>
  const maxType = Math.max(1, ...stats.byType.map((item) => item.count))
  return <section className="rounded-2xl border bg-white p-5 shadow-sm"><header className="flex flex-wrap items-center gap-2"><MessageCircle className="h-5 w-5 text-green-600" /><h2 className="font-black text-gray-900">{t('whatsapp.analytics_title')}</h2><span className="ml-auto rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{t('whatsapp.analytics_last_30')}</span></header><div className="mt-4 rounded-xl bg-green-50 p-4 text-center"><p className="text-4xl font-black text-green-700">{stats.totalClicks}</p><p className="mt-1 text-sm text-gray-600">{t('whatsapp.analytics_total')}</p></div>
    {stats.totalClicks === 0 ? <p className="mt-4 text-center text-sm text-gray-500">{t('whatsapp.analytics_empty')}</p> : <div className="mt-5 grid gap-6 lg:grid-cols-2"><div><h3 className="text-xs font-black uppercase tracking-wider text-gray-500">{t('whatsapp.analytics_by_type')}</h3><div className="mt-3 space-y-3">{stats.byType.map((item) => <div key={item.eventType}><div className="flex justify-between gap-3 text-sm"><span className="text-gray-600">{t(`whatsapp.analytics_event_${item.eventType}`)}</span><strong>{item.count}</strong></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${item.count / maxType * 100}%` }} /></div></div>)}</div></div><div><h3 className="text-xs font-black uppercase tracking-wider text-gray-500">{t('whatsapp.analytics_by_language')}</h3><div className="mt-3 space-y-2">{stats.byLanguage.map((item) => <p key={item.language} className="flex justify-between rounded-xl bg-gray-50 p-3 text-sm"><span>{item.language === 'rw' ? t('whatsapp.analytics_rw') : t('whatsapp.analytics_en')}</span><strong>{item.count}</strong></p>)}</div><h3 className="mt-5 text-xs font-black uppercase tracking-wider text-gray-500">{t('whatsapp.analytics_top_products')}</h3>{stats.topProducts.length ? <ol className="mt-2 space-y-2">{stats.topProducts.map((item) => <li key={item.productId} className="flex justify-between gap-3 text-sm"><span className="truncate text-gray-600">{item.productName}</span><strong>{item.count}</strong></li>)}</ol> : <p className="mt-2 text-sm text-gray-500">{t('whatsapp.analytics_no_products')}</p>}</div></div>}
  </section>
}
