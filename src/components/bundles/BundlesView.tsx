'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import BundleCard, { type BundleCardData } from '@/components/bundles/BundleCard'
import { useT } from '@/lib/i18n/LanguageContext'

const TYPES = ['', 'ROUTINE', 'CONCERN', 'HAIR', 'MAKEUP', 'GIFT', 'STARTER'] as const

export default function BundlesView() {
  const t = useT()
  const [bundles, setBundles] = useState<BundleCardData[]>([])
  const [activeType, setActiveType] = useState<(typeof TYPES)[number]>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [request, setRequest] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(false)
    const query = activeType ? `?type=${encodeURIComponent(activeType)}` : ''
    fetch(`/api/bundles${query}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => setBundles(result.data || []))
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) { setError(true); setBundles([]) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [activeType, request])

  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <header className="mx-auto max-w-2xl text-center"><h1 className="text-3xl font-black text-gray-900">{t('bundles.title')}</h1><p className="mt-2 text-sm leading-6 text-gray-500">{t('bundles.subtitle')}</p></header>

    <section className="mt-7 rounded-3xl bg-gradient-to-br from-[#B76E79] to-[#73434b] p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-7"><div><h2 className="flex items-center gap-2 text-xl font-black"><Sparkles className="h-5 w-5" />{t('bundles.quiz_title')}</h2><p className="mt-2 text-sm leading-6 text-white/80">{t('bundles.quiz_subtitle')}</p></div><Link href="/quiz" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-black text-[#B76E79] sm:mt-0 sm:shrink-0">{t('bundles.quiz_cta')}</Link></section>

    <nav className="scrollbar-hide mt-7 flex gap-2 overflow-x-auto pb-2" aria-label={t('bundles.filter_label')}>{TYPES.map((type) => <button key={type || 'all'} type="button" onClick={() => setActiveType(type)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${activeType === type ? 'bg-[#B76E79] text-white' : 'bg-gray-100 text-gray-700'}`}>{type ? t(`bundles.type_${type.toLowerCase()}`) : t('bundles.filter_all')}</button>)}</nav>

    {loading ? <div className="mt-8 flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin text-[#B76E79]" />{t('common.loading')}</div>
      : error ? <div className="mt-8 rounded-2xl bg-red-50 p-8 text-center"><p className="font-bold text-red-700">{t('bundles.load_failed')}</p><button type="button" onClick={() => setRequest((value) => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" />{t('common.retry')}</button></div>
        : bundles.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center"><p className="text-4xl"></p><h2 className="mt-3 font-black text-gray-800">{t('bundles.empty')}</h2><p className="mt-2 text-sm text-gray-500">{t('bundles.empty_hint')}</p></div>
          : <><div className="scrollbar-hide mt-8 flex snap-x gap-4 overflow-x-auto pb-3 md:hidden">{bundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}</div><div className="mt-8 hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">{bundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}</div></>}
  </main>
}
