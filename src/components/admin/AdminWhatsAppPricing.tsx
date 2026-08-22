'use client'

/**
 * WhatsApp pricing dashboard.
 *
 * Three steps, in the order the owner actually performs them:
 *   1. Pick a batch, copy or open the WhatsApp message.
 *   2. Paste the reply, review what was parsed, save.
 *   3. Or send a signed link so the father types the prices himself.
 *
 * Every price shown in the preview is what the parser read, never a guess. A
 * line the parser could not read with confidence appears in the problems list
 * instead of being approximated to the nearest product.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Link2, Loader2, MessageCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { formatRWF } from '@/lib/format'
import {
  DEFAULT_BATCH_SIZE,
  buildPriceBatches,
  buildPriceRequestUrl,
  fitsWhatsAppUrl,
  generateWhatsAppPriceRequest,
  parseWhatsAppPriceReply,
  type ParsedPrice,
  type ParseIssue,
  type PricingProduct,
} from '@/lib/whatsapp-pricing'

interface UnpricedProduct extends PricingProduct {
  nameRw: string | null
  category: string | null
}

export default function AdminWhatsAppPricing() {
  const t = useT()
  const { toast } = useToast()

  const [products, setProducts] = useState<UnpricedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [batchIndex, setBatchIndex] = useState(0)
  const [photoLink, setPhotoLink] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [parsed, setParsed] = useState<{ matched: ParsedPrice[]; issues: ParseIssue[] } | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/products/unpriced', { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed')
      setProducts(body.data.products)
    } catch {
      toast({ title: t('pricing.load_failed'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => { void load() }, [load])

  const batches = useMemo(() => buildPriceBatches(products, DEFAULT_BATCH_SIZE), [products])
  const batch = batches[batchIndex]

  const message = useMemo(
    () => (batch ? generateWhatsAppPriceRequest(batch, { photoUrl: photoLink, language: 'rw' }) : ''),
    [batch, photoLink],
  )
  const waUrl = useMemo(() => buildPriceRequestUrl(message), [message])
  const tooLong = useMemo(() => (message ? !fitsWhatsAppUrl(message) : false), [message])

  // The reply is parsed against the batch that was sent, so line numbers line up.
  const handleParse = () => {
    if (!batch) return
    const result = parseWhatsAppPriceReply(reply, batch.products)
    setParsed(result)
    if (result.matched.length === 0) {
      toast({ title: t('pricing.parse_none'), variant: 'destructive' })
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: t('pricing.copied') })
    } catch {
      toast({ title: t('pricing.copy_failed'), variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (!parsed || parsed.matched.length === 0) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/products/price-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prices: parsed.matched.map((row) => ({
            slug: row.slug,
            retail: row.retail,
            wholesale: row.wholesale,
          })),
        }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed')
      toast({ title: t('pricing.saved', { count: String(body.data.updated) }) })
      setReply('')
      setParsed(null)
      await load()
    } catch {
      toast({ title: t('pricing.save_failed'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleShareLink = async () => {
    try {
      const response = await fetch('/api/admin/products/quick-price-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batchIndex + 1 }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed')
      const url = `${window.location.origin}/quick-prices?token=${body.data.token}`
      setShareLink(url)
      setPhotoLink(url)
      toast({ title: t('pricing.link_ready', { days: String(body.data.expiresInDays) }) })
    } catch {
      toast({ title: t('pricing.link_failed'), variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-fcs-brand-text motion-reduce:animate-none" />
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-4xl">
      <header>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-fcs-brand-text" aria-hidden="true" />
          <h1 className="text-2xl font-black text-fcs-text">{t('pricing.title')}</h1>
        </div>
        <p className="mt-2 text-sm text-fcs-text-muted">
          {t('pricing.subtitle', { count: String(products.length) })}
        </p>
      </header>

      {products.length === 0 && (
        <p className="mt-6 rounded-fcs-md border border-fcs-border bg-fcs-surface p-4 text-sm text-fcs-text">
          {t('pricing.all_done')}
        </p>
      )}

      {batch && (
        <>
          {/* ─── 1. Send ─────────────────────────────────────────────── */}
          <section className="mt-6 rounded-fcs-md border border-fcs-border bg-white p-4">
            <h2 className="font-black text-fcs-text">{t('pricing.step1_title')}</h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="batch" className="text-sm text-fcs-text-muted">{t('pricing.batch_label')}</label>
              <select
                id="batch"
                value={batchIndex}
                onChange={(event) => { setBatchIndex(Number(event.target.value)); setParsed(null) }}
                className="min-h-11 rounded-fcs-sm border border-fcs-border bg-white px-3 text-sm text-fcs-text"
              >
                {batches.map((entry, position) => (
                  <option key={entry.index} value={position}>
                    {t('pricing.batch_option', {
                      index: String(entry.index),
                      total: String(entry.total),
                      count: String(entry.products.length),
                    })}
                  </option>
                ))}
              </select>
            </div>

            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-fcs-sm border border-fcs-border bg-fcs-surface p-3 text-xs text-fcs-text">
              {message}
            </pre>

            {tooLong && (
              <p className="mt-2 flex items-start gap-2 text-xs text-fcs-umber">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('pricing.too_long')}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-fcs-md bg-fcs-whatsapp-pill px-4 text-sm font-bold text-white transition-colors hover:bg-fcs-whatsapp-pill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t('pricing.open_whatsapp')}
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-11 items-center gap-2 rounded-fcs-md border border-fcs-brand-strong px-4 text-sm font-bold text-fcs-brand-text transition-colors hover:bg-fcs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {t('pricing.copy_message')}
              </button>
            </div>
          </section>

          {/* ─── 2. Paste the reply ──────────────────────────────────── */}
          <section className="mt-4 rounded-fcs-md border border-fcs-border bg-white p-4">
            <h2 className="font-black text-fcs-text">{t('pricing.step2_title')}</h2>

            <label htmlFor="reply" className="sr-only">{t('pricing.paste_label')}</label>
            <textarea
              id="reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder={t('pricing.paste_placeholder')}
              rows={8}
              className="mt-3 w-full rounded-fcs-sm border border-fcs-border bg-fcs-surface p-3 font-mono text-xs text-fcs-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleParse}
                disabled={!reply.trim()}
                className="inline-flex min-h-11 items-center gap-2 rounded-fcs-md border border-fcs-brand-strong px-4 text-sm font-bold text-fcs-brand-text transition-colors hover:bg-fcs-surface disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t('pricing.parse')}
              </button>
            </div>

            {parsed && (
              <div className="mt-4">
                {parsed.matched.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">{t('pricing.preview_caption')}</caption>
                      <thead>
                        <tr className="border-b border-fcs-border text-xs uppercase tracking-wide text-fcs-text-muted">
                          <th scope="col" className="py-2 pr-3">{t('pricing.col_product')}</th>
                          <th scope="col" className="py-2 pr-3">{t('pricing.col_retail')}</th>
                          <th scope="col" className="py-2">{t('pricing.col_wholesale')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.matched.map((row) => (
                          <tr key={row.slug} className="border-b border-fcs-border/60">
                            <td className="py-2 pr-3 text-fcs-text">{row.name}</td>
                            <td className="py-2 pr-3 font-bold text-fcs-text">{formatRWF(row.retail)}</td>
                            <td className="py-2 text-fcs-text-muted">
                              {row.wholesale != null ? formatRWF(row.wholesale) : t('pricing.unchanged')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {parsed.issues.length > 0 && (
                  <div className="mt-3 rounded-fcs-sm border border-fcs-umber/40 bg-fcs-surface p-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-fcs-umber">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      {t('pricing.issues_title', { count: String(parsed.issues.length) })}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-fcs-text">
                      {parsed.issues.map((issue, position) => (
                        <li key={`${issue.code}-${position}`}>
                          <span className="font-mono">{issue.line.slice(0, 48)}</span> — {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsed.matched.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-fcs-md bg-fcs-brand-strong px-4 text-sm font-bold text-white transition-colors hover:bg-fcs-brand-strong-hover disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {t('pricing.save_all', { count: String(parsed.matched.length) })}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ─── 3. Signed link ──────────────────────────────────────── */}
          <section className="mt-4 rounded-fcs-md border border-fcs-border bg-white p-4">
            <h2 className="font-black text-fcs-text">{t('pricing.step3_title')}</h2>
            <p className="mt-1 text-sm text-fcs-text-muted">{t('pricing.step3_hint')}</p>

            <button
              type="button"
              onClick={handleShareLink}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-fcs-md border border-fcs-brand-strong px-4 text-sm font-bold text-fcs-brand-text transition-colors hover:bg-fcs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {t('pricing.make_link')}
            </button>

            {shareLink && (
              <p className="mt-3 break-all rounded-fcs-sm border border-fcs-border bg-fcs-surface p-3 font-mono text-xs text-fcs-text">
                {shareLink}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}
