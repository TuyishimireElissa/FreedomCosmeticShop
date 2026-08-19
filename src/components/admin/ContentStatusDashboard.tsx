'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  PackageSearch,
  Pencil,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useT } from '@/lib/i18n/LanguageContext'

interface ProductStatusRow {
  id: string
  name: string
  slug: string
  sku: string | null
  category: string
  categoryName: string
  brand: string | null
  image: string | null
  units: number
  present: string[]
  missing: string[]
  presentCount: number
  missingCount: number
  isComplete: boolean
  criticalMissing: string[]
  rwMissing: string[]
}

interface FieldCompletionRow {
  field: string
  complete: number
  missing: number
  pct: number
}

interface ContentStats {
  generatedAt: string
  totals: { total: number; complete: number; partial: number; missingCritical: number }
  fields: FieldCompletionRow[]
  products: ProductStatusRow[]
  priorities: {
    bestSellersIncomplete: ProductStatusRow[]
    missingCritical: ProductStatusRow[]
    missingKinyarwanda: ProductStatusRow[]
  }
}

type SortMode = 'missing' | 'name' | 'units'

export default function ContentStatusDashboard() {
  const t = useT()
  const [data, setData] = useState<ContentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [fieldFilter, setFieldFilter] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('missing')

  const load = () => {
    setLoading(true)
    setError(null)
    fetch('/api/admin/products/content-stats', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(response.status === 401 ? t('admin_content.session_expired') : t('admin_content.load_failed'))
        return response.json()
      })
      .then((payload: { success: boolean; data: ContentStats; error?: string }) => {
        if (!payload.success || !payload.data) throw new Error(payload.error || t('admin_content.load_failed'))
        setData(payload.data)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : t('admin_content.load_failed')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(() => {
    if (!data) return []
    const map = new Map<string, string>()
    for (const product of data.products) {
      if (!map.has(product.category)) map.set(product.category, product.categoryName)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    return data.products.filter((product) => {
      if (query && !product.name.toLowerCase().includes(query) && !product.slug.toLowerCase().includes(query)) return false
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
      if (fieldFilter !== 'all' && !product.missing.includes(fieldFilter)) return false
      return true
    }).sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name)
      if (sortMode === 'units') return b.units - a.units || b.missingCount - a.missingCount
      return b.missingCount - a.missingCount || a.name.localeCompare(b.name)
    })
  }, [data, search, categoryFilter, fieldFilter, sortMode])

  if (loading) return <LoadingState />
  if (error || !data) {
    return (
      <div className="rounded-xl border border-fcs-border bg-fcs-surface p-8 text-center">
        <p role="alert" className="text-sm font-semibold text-fcs-error">{error || t('admin_content.load_failed')}</p>
        <Button type="button" variant="outline" onClick={load} className="mt-4 gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('admin_content.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fcs-text">{t('admin_content.title')}</h1>
          <p className="mt-1 text-sm leading-6 text-fcs-text-muted">{t('admin_content.subtitle')}</p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <a href="/api/admin/products/content-stats?format=csv" download>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('admin_content.export_csv')}
          </a>
        </Button>
      </div>

      {/* ─── Overview stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('admin_content.stat_total')} value={String(data.totals.total)} />
        <StatCard label={t('admin_content.stat_complete')} value={String(data.totals.complete)} tone={data.totals.complete > 0 ? 'success' : 'neutral'} />
        <StatCard label={t('admin_content.stat_partial')} value={String(data.totals.partial)} tone="warning" />
        <StatCard label={t('admin_content.stat_critical')} value={String(data.totals.missingCritical)} tone={data.totals.missingCritical > 0 ? 'error' : 'neutral'} />
      </div>

      {/* ─── Field completion table ─────────────────────────────────── */}
      <Card className="border-fcs-border bg-fcs-surface">
        <CardHeader>
          <CardTitle className="text-fcs-text">{t('admin_content.fields_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-fcs-border-subtle text-xs font-semibold uppercase tracking-wider text-fcs-text-muted">
                  <th scope="col" className="py-2 pr-4">{t('admin_content.field_col')}</th>
                  <th scope="col" className="py-2 pr-4 text-right">{t('admin_content.complete_col')}</th>
                  <th scope="col" className="py-2 pr-4 text-right">{t('admin_content.missing_col')}</th>
                  <th scope="col" className="w-1/3 py-2 text-right">{t('admin_content.pct_col')}</th>
                </tr>
              </thead>
              <tbody>
                {data.fields.map((row) => (
                  <tr key={row.field} className="border-b border-fcs-border-subtle last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-fcs-text">{row.field}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-fcs-text">{row.complete}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums ${row.missing > 0 ? 'font-semibold text-fcs-warning' : 'text-fcs-text'}`}>{row.missing}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-fcs-surface-muted" role="presentation">
                          <div className={`h-full rounded-full ${row.pct === 100 ? 'bg-fcs-success' : row.pct > 0 ? 'bg-fcs-brand-text' : 'bg-fcs-border'}`} style={{ width: `${row.pct}%` }} />
                        </div>
                        <span className="w-14 text-right text-xs tabular-nums text-fcs-text-muted">{row.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Products needing work ──────────────────────────────────── */}
      <Card className="border-fcs-border bg-fcs-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-fcs-text">
            <PackageSearch className="h-4 w-4 text-fcs-brand-text" aria-hidden="true" />
            {t('admin_content.needs_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('admin_content.search_placeholder')}
              aria-label={t('admin_content.search_placeholder')}
            />
            <label className="sr-only" htmlFor="content-category-filter">{t('admin_content.filter_category')}</label>
            <select
              id="content-category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-lg border border-fcs-border bg-white px-3 text-sm text-fcs-text focus:border-fcs-brand-text focus:outline-none focus:ring-1 focus:ring-fcs-brand-text"
            >
              <option value="all">{t('admin_content.filter_category')}</option>
              {categories.map(([slug, name]) => (
                <option key={slug} value={slug}>{name}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="content-field-filter">{t('admin_content.filter_field')}</label>
            <select
              id="content-field-filter"
              value={fieldFilter}
              onChange={(event) => setFieldFilter(event.target.value)}
              className="h-10 rounded-lg border border-fcs-border bg-white px-3 text-sm text-fcs-text focus:border-fcs-brand-text focus:outline-none focus:ring-1 focus:ring-fcs-brand-text"
            >
              <option value="all">{t('admin_content.filter_field')}</option>
              {data.fields.map((row) => (
                <option key={row.field} value={row.field}>{row.field}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-fcs-text-muted" aria-live="polite">
            {t('admin_content.matching_products', { count: filtered.length })}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-fcs-border-subtle text-xs font-semibold uppercase tracking-wider text-fcs-text-muted">
                  <th scope="col" className="py-2 pr-4">{t('admin_content.product_col')}</th>
                  <th scope="col" className="py-2 pr-4">{t('admin_content.category_col')}</th>
                  <th scope="col" className="py-2 pr-4">
                    <SortButton mode="missing" current={sortMode} onClick={() => setSortMode('missing')} label={t('admin_content.missing_col')} />
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    <SortButton mode="units" current={sortMode} onClick={() => setSortMode('units')} label={t('admin_content.ordered_col')} />
                  </th>
                  <th scope="col" className="py-2">
                    <SortButton mode="name" current={sortMode} onClick={() => setSortMode('name')} label={t('admin_content.name_col')} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-fcs-text-muted">{t('admin_content.empty_state')}</td>
                  </tr>
                )}
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-fcs-border-subtle align-middle last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg border border-fcs-border-subtle object-cover" />
                        ) : (
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-fcs-border-subtle bg-fcs-surface-muted" aria-hidden="true">
                            <ImageIcon className="h-4 w-4 text-fcs-text-muted" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer" className="block max-w-[220px] truncate font-semibold text-fcs-brand-text hover:underline">
                            {product.name}
                            <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
                          </a>
                          <p className="max-w-[220px] truncate text-xs text-fcs-text-muted">{product.brand || product.sku || product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-xs text-fcs-text">{product.categoryName}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className={product.missingCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}>
                        {product.isComplete ? t('admin_content.complete_label') : t('admin_content.missing_badge', { count: product.missingCount })}
                      </Badge>
                      {product.rwMissing.length > 0 && (
                        <p className="mt-1 text-xs text-fcs-text-muted">{t('admin_content.rw_badge', { count: product.rwMissing.length })}</p>
                      )}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-fcs-text">{product.units > 0 ? t('admin_content.units_sold', { count: product.units }) : '—'}</td>
                    <td className="py-2 text-right">
                      <Button asChild variant="outline" size="sm" className="gap-1">
                        <a href="/admin/products">
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          {t('admin_content.edit')}
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Priority suggestions ───────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PriorityCard
          icon={<TrendingUp className="h-4 w-4 text-fcs-brand-text" aria-hidden="true" />}
          title={t('admin_content.priority_best')}
          rows={data.priorities.bestSellersIncomplete}
          renderMeta={(product) => t('admin_content.units_sold', { count: product.units })}
        />
        <PriorityCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />}
          title={t('admin_content.priority_critical')}
          rows={data.priorities.missingCritical}
          renderMeta={(product) => product.criticalMissing.join(', ')}
        />
        <PriorityCard
          icon={<CheckCircle2 className="h-4 w-4 text-fcs-success" aria-hidden="true" />}
          title={t('admin_content.priority_rw')}
          rows={data.priorities.missingKinyarwanda}
          renderMeta={(product) => t('admin_content.rw_badge', { count: product.rwMissing.length })}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' | 'warning' | 'error' }) {
  const toneClass = tone === 'success' ? 'text-fcs-success' : tone === 'warning' ? 'text-fcs-warning' : tone === 'error' ? 'text-fcs-error' : 'text-fcs-text'
  return (
    <div className="rounded-xl border border-fcs-border-subtle bg-fcs-surface-secondary p-4">
      <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-fcs-text-muted">{label}</p>
    </div>
  )
}

function SortButton({ mode, current, onClick, label }: { mode: SortMode; current: SortMode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-fcs-text ${current === mode ? 'text-fcs-brand-text' : ''}`}>
      {label}
      <span aria-hidden="true">{current === mode ? '▼' : '·'}</span>
    </button>
  )
}

function PriorityCard({ icon, title, rows, renderMeta }: {
  icon: React.ReactNode
  title: string
  rows: ProductStatusRow[]
  renderMeta: (product: ProductStatusRow) => string
}) {
  const t = useT()
  return (
    <Card className="border-fcs-border bg-fcs-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-fcs-text">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-fcs-text-muted">{t('admin_content.none')}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((product) => (
              <li key={product.id} className="flex items-start justify-between gap-2 text-sm">
                <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-fcs-brand-text hover:underline">
                  {product.name}
                </a>
                <span className="shrink-0 text-xs tabular-nums text-fcs-text-muted">{renderMeta(product)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  const t = useT()
  return (
    <div className="grid place-items-center rounded-xl border border-fcs-border bg-fcs-surface py-16">
      <Loader2 className="h-6 w-6 animate-spin text-fcs-brand-text" aria-hidden="true" />
      <p className="mt-3 text-sm text-fcs-text-muted">{t('admin_content.loading')}</p>
    </div>
  )
}
