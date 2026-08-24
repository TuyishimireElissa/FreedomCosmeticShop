'use client'

/**
 * Mobile pricing form for the shop owner's father.
 *
 * He is not an admin, has no login, and is on a phone on a Rwandan mobile
 * connection. So: Kinyarwanda first, one product per card, big tap targets,
 * photos small, and the form saves in one press at the end rather than
 * per-field.
 *
 * Access is a signed 7-day token in the query string. The page shows a plain
 * "link expired" message rather than a login prompt, because there is no
 * account he could log into.
 */

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, Plus } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface Row {
  slug: string
  name: string
  nameRw: string | null
  sku: string | null
  imageUrl: string | null
}

export default function QuickPricesClient() {
  const t = useT()
  const params = useSearchParams()
  const token = params.get('token')

  const [rows, setRows] = useState<Row[]>([])
  const [values, setValues] = useState<Record<string, { retail: string; wholesale: string }>>({})
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'saved'>('loading')
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  // Slugs the server confirmed it wrote, so each card can show its own tick
  // rather than the whole page flipping to one summary screen.
  const [savedSlugs, setSavedSlugs] = useState<string[]>([])
  // Wholesale is hidden by default: at 360px two inputs side by side leave
  // about 150px each, and wholesale is the optional one.
  const [openWholesale, setOpenWholesale] = useState<string[]>([])

  const load = useCallback(async () => {
    if (!token) { setState('denied'); return }
    try {
      const response = await fetch(`/api/admin/products/unpriced?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      if (!response.ok) { setState('denied'); return }
      const body = await response.json()
      if (!body.success) { setState('denied'); return }
      setRows(body.data.products)
      setState('ready')
    } catch {
      setState('denied')
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  const setField = (slug: string, field: 'retail' | 'wholesale', value: string) => {
    // Digits only: a phone keyboard makes stray characters easy, and the API
    // rejects them anyway. Better to prevent than to explain.
    const digits = value.replace(/\D/g, '').slice(0, 8)
    setValues((current) => ({
      ...current,
      [slug]: { retail: '', wholesale: '', ...current[slug], [field]: digits },
    }))
  }

  const filled = Object.entries(values).filter(([, entry]) => entry.retail.trim() !== '')

  const handleSave = async () => {
    if (!token || filled.length === 0) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/products/price-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prices: filled.map(([slug, entry]) => ({
            slug,
            retail: Number(entry.retail),
            wholesale: entry.wholesale.trim() ? Number(entry.wholesale) : null,
          })),
        }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error('failed')
      setSavedCount(body.data.updated)
      // Mark only the rows the server actually wrote. A row it skipped because
      // the product already had a price must not show a tick.
      const written = Array.isArray(body.data.results)
        ? body.data.results.filter((row: { status: string }) => row.status === 'updated')
          .map((row: { slug: string }) => row.slug)
        : filled.map(([slug]) => slug)
      setSavedSlugs(written)
      setState('saved')
    } catch {
      setSaving(false)
    }
  }

  if (state === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center bg-fcs-surface">
        <Loader2 className="h-6 w-6 animate-spin text-fcs-brand-text motion-reduce:animate-none" />
      </main>
    )
  }

  if (state === 'denied') {
    return (
      <main className="grid min-h-dvh place-items-center bg-fcs-surface px-4">
        <p className="max-w-sm text-center text-base text-fcs-text">{t('pricing.link_expired')}</p>
      </main>
    )
  }

  if (state === 'saved') {
    return (
      <main className="grid min-h-dvh place-items-center bg-fcs-surface px-4">
        <div className="text-center">
          <Check className="mx-auto h-10 w-10 text-fcs-whatsapp-pill" aria-hidden="true" />
          <p className="mt-3 text-lg font-bold text-fcs-text">
            {t('pricing.saved', { count: String(savedCount) })}
          </p>
          <p className="mt-1 text-sm text-fcs-text-muted">{t('pricing.thanks')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-fcs-surface pb-28">
      <header className="border-b border-fcs-border bg-white px-4 py-4">
        <h1 className="text-lg font-black text-fcs-text">{t('pricing.quick_title')}</h1>
        <p className="mt-1 text-sm text-fcs-text-muted">{t('pricing.quick_hint')}</p>
      </header>

      <ol className="space-y-3 p-4">
        {rows.map((row) => {
          const isSaved = savedSlugs.includes(row.slug)
          const wholesaleOpen = openWholesale.includes(row.slug)
          return (
          <li
            key={row.slug}
            className={`rounded-fcs-md border bg-white p-3 ${isSaved ? 'border-fcs-whatsapp-pill' : 'border-fcs-border'}`}
          >
            <div className="flex gap-3">
              {row.imageUrl ? (
                <img
                  src={row.imageUrl.replace('/upload/', '/upload/w_128,h_128,c_fill,q_auto,f_auto/')}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-16 shrink-0 rounded-fcs-sm bg-fcs-surface object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-fcs-sm bg-fcs-surface px-1 text-center text-[11px] text-fcs-text-muted">
                  {t('pricing.no_photo')}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-fcs-text">{row.nameRw || row.name}</p>
                {row.sku && <p className="mt-0.5 font-mono text-[11px] text-fcs-text-muted">{row.sku}</p>}
                {/* pill-hover, not pill: #1E874A on fcs-surface is 4.29:1,
                    which fails AA for text. #17703D is 5.79:1. */}
                {isSaved && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-fcs-surface px-2 py-0.5 text-[11px] font-bold text-fcs-whatsapp-pill-hover">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {t('pricing.saved_row')}
                  </p>
                )}
              </div>
            </div>

            {/* Retail takes the full width. At 360px a two-column grid gives
                each input about 150px, and retail is the one that matters. */}
            <div className="mt-3">
              <label htmlFor={`r-${row.slug}`} className="block text-[11px] font-bold uppercase tracking-wide text-fcs-text-muted">
                {t('pricing.col_retail')}
              </label>
              <input
                id={`r-${row.slug}`}
                inputMode="numeric"
                autoComplete="off"
                value={values[row.slug]?.retail ?? ''}
                onChange={(event) => setField(row.slug, 'retail', event.target.value)}
                placeholder="0"
                className="mt-1 min-h-12 w-full rounded-fcs-sm border border-fcs-border bg-fcs-surface px-3 text-lg text-fcs-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
              />
            </div>

            {/* Wholesale is optional, so it stays folded away until asked for. */}
            {wholesaleOpen ? (
              <div className="mt-2">
                <label htmlFor={`w-${row.slug}`} className="block text-[11px] font-bold uppercase tracking-wide text-fcs-text-muted">
                  {t('pricing.col_wholesale')}
                </label>
                <input
                  id={`w-${row.slug}`}
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={values[row.slug]?.wholesale ?? ''}
                  onChange={(event) => setField(row.slug, 'wholesale', event.target.value)}
                  placeholder={t('pricing.optional')}
                  className="mt-1 min-h-12 w-full rounded-fcs-sm border border-fcs-border bg-fcs-surface px-3 text-lg text-fcs-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpenWholesale((current) => [...current, row.slug])}
                aria-expanded={false}
                aria-controls={`w-${row.slug}`}
                className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-fcs-brand-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('pricing.col_wholesale')}
              </button>
            )}
          </li>
          )
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 border-t border-fcs-border bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || filled.length === 0}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-fcs-md bg-fcs-whatsapp-pill text-base font-bold text-white transition-colors hover:bg-fcs-whatsapp-pill-hover disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {t('pricing.send_prices', { count: String(filled.length) })}
        </button>
      </div>
    </main>
  )
}
