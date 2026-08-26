'use client'

/**
 * Backup and recovery dashboard.
 *
 * Deliberately small. It answers three questions the owner actually has after
 * losing a database once:
 *   1. What would a backup taken right now contain?
 *   2. Can I get a copy onto my own phone or laptop, today?
 *   3. Is anything broken?
 *
 * It does NOT offer a "create backup on the server" button. Vercel's
 * filesystem is read-only, so such a button would fail every time in
 * production. Instant backup downloads straight to the device instead, which
 * is also the copy that survives the hosting account disappearing.
 */

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import { useToast } from '@/hooks/use-toast'

interface ServiceState { ok: boolean; detail: string }
interface StatusPayload {
  coverage: Record<string, number>
  lastCatalogueChange: string | null
  warnings: string[]
  services: { database: ServiceState; cloudinary: ServiceState; hosting: ServiceState }
  automation: { workflow: string; schedule: string; note: string }
}

const COVERAGE_LABELS: Record<string, string> = {
  products: 'backups.products',
  productImages: 'backups.images',
  categories: 'backups.categories',
  brands: 'backups.brands',
  coupons: 'backups.coupons',
  deliveryZones: 'backups.zones',
  storeSettings: 'backups.settings',
  users: 'backups.users',
  orders: 'backups.orders',
}

export default function AdminSystemBackups() {
  const t = useT()
  const { toast } = useToast()

  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/backups/status', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Server returned ${response.status}`)
      const body = await response.json()
      if (!body.success) throw new Error(body.error || 'Failed')
      setLoadError(null)
      setStatus(body.data)
    } catch {
      setLoadError(t('backups.load_failed'))
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch('/api/admin/backup', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Server returned ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `freedom-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      toast({ title: t('backups.download_done'), description: t('backups.download_hint') })
    } catch {
      toast({ title: t('backups.download_failed'), variant: 'destructive' })
    } finally {
      setDownloading(false)
    }
  }

  const serviceRow = (label: string, state: ServiceState) => (
    <li key={label} className="flex items-start gap-2 py-2">
      {state.ok
        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fcs-whatsapp-pill-hover" aria-hidden="true" />
        : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-fcs-umber" aria-hidden="true" />}
      <span className="min-w-0">
        <span className="block text-sm font-bold text-fcs-text">{label}</span>
        <span className="block text-xs text-fcs-text-muted">{state.detail}</span>
      </span>
    </li>
  )

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-fcs-text">{t('backups.title')}</h1>
          <p className="mt-1 text-sm text-fcs-text-muted">{t('backups.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-fcs-md border border-fcs-border bg-white px-4 text-sm font-bold text-fcs-text disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          {t('backups.refresh')}
        </button>
      </div>

      {loadError && (
        <div className="mt-6 rounded-fcs-md border border-fcs-border bg-white p-4 text-center" role="alert">
          <AlertTriangle className="mx-auto h-8 w-8 text-fcs-umber" aria-hidden="true" />
          <p className="mt-2 text-sm text-fcs-text">{loadError}</p>
        </div>
      )}

      {status && (
        <>
          {/* 1. What a backup right now would contain */}
          <section className="mt-6 rounded-fcs-md border border-fcs-border bg-white p-4">
            <h2 className="font-black text-fcs-text">{t('backups.coverage_title')}</h2>
            <p className="mt-1 text-sm text-fcs-text-muted">{t('backups.coverage_hint')}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(status.coverage).map(([key, value]) => (
                <div key={key} className="rounded-fcs-sm border border-fcs-border bg-fcs-surface p-3">
                  <dt className="text-xs text-fcs-text-muted">{COVERAGE_LABELS[key] ? t(COVERAGE_LABELS[key]) : key}</dt>
                  <dd className="mt-0.5 text-lg font-black text-fcs-text">{value}</dd>
                </div>
              ))}
            </dl>
            {status.lastCatalogueChange && (
              <p className="mt-3 text-xs text-fcs-text-muted">
                {t('backups.last_change', { when: new Date(status.lastCatalogueChange).toLocaleString('en-RW') })}
              </p>
            )}
            {status.warnings.map((warning) => (
              <p key={warning} className="mt-3 flex items-start gap-2 rounded-fcs-sm bg-fcs-surface p-3 text-xs text-fcs-umber">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{warning}</span>
              </p>
            ))}
          </section>

          {/* 2. Get a copy off the server */}
          <section className="mt-4 rounded-fcs-md border border-fcs-border bg-white p-4">
            <h2 className="font-black text-fcs-text">{t('backups.download_title')}</h2>
            <p className="mt-1 text-sm text-fcs-text-muted">{t('backups.download_desc')}</p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-fcs-md bg-fcs-brand-strong px-4 text-base font-bold text-white transition-colors hover:bg-fcs-brand-strong-hover disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong sm:w-auto"
            >
              {downloading
                ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                : <Download className="h-4 w-4" aria-hidden="true" />}
              {t('backups.download_button')}
            </button>
          </section>

          {/* 3. Automatic nightly backup */}
          <section className="mt-4 rounded-fcs-md border border-fcs-border bg-white p-4">
            <h2 className="flex items-center gap-2 font-black text-fcs-text">
              <ShieldCheck className="h-5 w-5 text-fcs-whatsapp-pill-hover" aria-hidden="true" />
              {t('backups.auto_title')}
            </h2>
            <p className="mt-1 text-sm text-fcs-text-muted">{t('backups.auto_schedule', { schedule: status.automation.schedule })}</p>
            <p className="mt-2 text-xs text-fcs-text-muted">{status.automation.note}</p>
            <p className="mt-2 font-mono text-[11px] text-fcs-text-muted">{status.automation.workflow}</p>
          </section>

          {/* 4. Service health */}
          <section className="mt-4 rounded-fcs-md border border-fcs-border bg-white p-4">
            <h2 className="font-black text-fcs-text">{t('backups.health_title')}</h2>
            <ul className="mt-2 divide-y divide-fcs-border">
              {serviceRow(t('backups.svc_database'), status.services.database)}
              {serviceRow(t('backups.svc_cloudinary'), status.services.cloudinary)}
              {serviceRow(t('backups.svc_hosting'), status.services.hosting)}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
