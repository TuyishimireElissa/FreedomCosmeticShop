'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface ZeroResultEntry {
  query: string
  count: number
  lastSearched: string | null
}

export default function ZeroResultSearches() {
  const t = useT()
  const [data, setData] = useState<ZeroResultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [request, setRequest] = useState(0)

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/admin/search/zero-results', { signal, cache: 'no-store' })
      if (!response.ok) throw new Error()
      const result = await response.json()
      setData(result.data || [])
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(true)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load, request])

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500" />
        <h2 className="font-bold text-gray-900">{t('search.zero_results_title')}</h2>
        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">{t('search.zero_results_badge')}</span>
        {!loading && !error && <span className="ml-auto text-xs text-gray-400">{t('search.zero_results_terms', { count: data.length })}</span>}
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-500">{t('search.zero_results_description')}</p>

      {loading ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-orange-500" />{t('common.loading')}</div>
        : error ? <div className="mt-4 rounded-xl bg-red-50 p-4 text-center"><p className="text-sm font-semibold text-red-700">{t('search.zero_results_load_failed')}</p><button type="button" onClick={() => setRequest((value) => value + 1)} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-gray-900 px-4 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />{t('common.retry')}</button></div>
          : data.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">{t('search.zero_results_empty')}</p>
            : <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">{data.map((entry) => <article key={entry.query} className="flex flex-wrap items-center gap-3 rounded-xl bg-orange-50/70 px-3 py-2.5"><Search className="h-4 w-4 shrink-0 text-orange-400" /><span className="min-w-0 flex-1 break-words text-sm font-semibold text-gray-900">{entry.query}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-orange-700">{t('search.zero_results_count', { count: entry.count })}</span>{entry.lastSearched && <time dateTime={entry.lastSearched} className="text-xs text-gray-400">{new Date(entry.lastSearched).toLocaleDateString('en-RW')}</time>}</article>)}</div>}
    </section>
  )
}
