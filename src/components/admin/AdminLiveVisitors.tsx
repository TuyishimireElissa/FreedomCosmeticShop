'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, MapPin, RefreshCw, Users } from 'lucide-react'

/**
 * Live visitor dashboard.
 *
 * Sector, cell and village are blank unless the visitor filled in the optional
 * location form: IP geolocation cannot resolve below district in Rwanda, where
 * mobile traffic is carrier-NATed through a few Kigali gateways. Rows are
 * labelled so the difference between an estimate and a stated location is
 * never ambiguous.
 */

interface VisitorRow {
  id: string
  country: string | null
  province: string | null
  district: string | null
  sector: string | null
  cell: string | null
  village: string | null
  isPreciseLocation: boolean
  device: string | null
  browser: string | null
  referrer: string | null
  currentPath: string | null
  pageViews: number
  secondsOnSite: number
  isOnline: boolean
}

interface VisitorPayload {
  counts: { live: number; today: number; week: number; month: number }
  districts: Array<{ district: string | null; visitors: number }>
  sessions: VisitorRow[]
}

const RANGES = [
  { value: 'now', label: 'Now' },
  { value: 'hour', label: 'Last hour' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const

const REFRESH_MS = 8000
const NOT_PROVIDED = 'Not provided'

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export default function AdminLiveVisitors() {
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('today')
  const [data, setData] = useState<VisitorPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch(`/api/admin/visitors?range=${range}`, { cache: 'no-store' })
      if (response.status === 401 || response.status === 403) {
        setError('You do not have permission to view visitor analytics.')
        return
      }
      if (!response.ok) throw new Error('Failed to load visitors')
      setData((await response.json()) as VisitorPayload)
      setError(null)
    } catch {
      setError('Visitor data could not be loaded. Retrying automatically.')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => { void load(true) }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const maxDistrict = Math.max(1, ...(data?.districts || []).map((entry) => entry.visitors))

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-950">Live visitors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Anonymous sessions. Sector, cell and village appear only when a visitor shares them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-fcs-brand hover:text-fcs-brand-text"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
          <a
            href={`/api/admin/visitors/export?range=${range}`}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-fcs-brand-strong px-4 text-sm font-bold text-white hover:bg-[#9B5A64]"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
            </span>
            Live now
          </p>
          <p className="mt-2 text-4xl font-black text-emerald-900">{data?.counts.live ?? '—'}</p>
          <p className="mt-1 text-xs text-emerald-700">Active in the last 60 seconds</p>
        </article>
        {([['Today', data?.counts.today], ['This week', data?.counts.week], ['This month', data?.counts.month]] as const).map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wider text-fcs-text-muted">{label}</p>
            <p className="mt-2 text-4xl font-black text-gray-950">{value ?? '—'}</p>
            <p className="mt-1 text-xs text-gray-500">Unique sessions</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange(option.value)}
            aria-pressed={range === option.value}
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${
              range === option.value ? 'bg-fcs-brand-strong text-white' : 'border border-gray-200 bg-white text-gray-700 hover:border-fcs-brand'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-black text-gray-950">
          <MapPin className="h-4 w-4 text-fcs-brand-text" aria-hidden="true" /> Districts this month
        </h2>
        <p className="mt-1 text-xs text-gray-500">Estimated from network location, so treat as approximate.</p>
        {data?.districts.length ? (
          <ul className="mt-4 space-y-2">
            {data.districts.map((entry) => (
              <li key={entry.district} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm font-semibold text-gray-700">{entry.district}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className="block h-full rounded-full bg-fcs-brand"
                    style={{ width: `${Math.max(4, (entry.visitors / maxDistrict) * 100)}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-sm font-bold text-gray-900">{entry.visitors}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No district data yet.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 p-5">
          <Users className="h-4 w-4 text-fcs-brand-text" aria-hidden="true" />
          <h2 className="font-black text-gray-950">Sessions</h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                {['', 'Country', 'Province', 'District', 'Sector', 'Cell', 'Village', 'Device', 'Page', 'Time'].map((heading) => (
                  <th key={heading} scope="col" className="px-3 py-3 font-black">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.sessions.length ? data.sessions.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${row.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}
                      title={row.isOnline ? 'Online now' : 'Left the site'}
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-700">{row.country || NOT_PROVIDED}</td>
                  <td className="px-3 py-3 text-gray-700">{row.province || NOT_PROVIDED}</td>
                  <td className="px-3 py-3 font-semibold text-gray-900">
                    {row.district || NOT_PROVIDED}
                    {row.district && (
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${row.isPreciseLocation ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {row.isPreciseLocation ? 'stated' : 'estimate'}
                      </span>
                    )}
                  </td>
                  <td className={`px-3 py-3 ${row.sector ? 'text-gray-700' : 'text-fcs-text-muted'}`}>{row.sector || NOT_PROVIDED}</td>
                  <td className={`px-3 py-3 ${row.cell ? 'text-gray-700' : 'text-fcs-text-muted'}`}>{row.cell || NOT_PROVIDED}</td>
                  <td className={`px-3 py-3 ${row.village ? 'text-gray-700' : 'text-fcs-text-muted'}`}>{row.village || NOT_PROVIDED}</td>
                  <td className="px-3 py-3 capitalize text-gray-700">{row.device || NOT_PROVIDED}</td>
                  <td className="max-w-[180px] truncate px-3 py-3 text-gray-600" title={row.currentPath || ''}>{row.currentPath || NOT_PROVIDED}</td>
                  <td className="px-3 py-3 text-gray-700">{duration(row.secondsOnSite)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-sm text-gray-500">
                    {loading ? 'Loading sessions…' : 'No visitors in this period yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
