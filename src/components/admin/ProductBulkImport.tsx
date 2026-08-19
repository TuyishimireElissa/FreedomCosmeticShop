'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardPaste, Info, Loader2, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n/LanguageContext'
import { ImportParseError, parseImportJson } from '@/lib/product-import'

const PLACEHOLDER_JSON = `{
  "products": [
    {
      "identifier": "SKU-OR-SLUG-TO-MATCH",
      "name": "English name",
      "nameRw": "Kinyarwanda name",
      "brand": "Brand name",
      "category": "category-slug",
      "shortDescription": "One line, max 160 chars",
      "shortDescriptionRw": "Umurongo umwe",
      "description": "2-3 paragraphs...",
      "descriptionRw": "Ibisobanuro...",
      "ingredients": "Vitamin C, Glycerin, Aloe Vera",
      "ingredientsRw": "Vitamini C, Glycerin",
      "howToUse": "Apply 3-4 drops every morning.",
      "howToUseRw": "Shyiramo ibitonyanga 3-4 buri gitondo.",
      "expectedResults": "Brighter skin within 2 weeks.",
      "expectedResultsRw": "Uruhu rumurika nyuma y'ibyumweru 2.",
      "warnings": "For external use only. Patch test first.",
      "warningsRw": "Igikoreshwa ku ruhu gusa.",
      "suitableFor": { "skinType": ["OILY", "DRY"], "hairType": ["CURLY"], "ageRange": "18+", "gender": "unisex" },
      "uniqueSellingPoints": ["Made in Rwanda", "Paraben-free", "Visible results in 14 days"],
      "seoKeywords": "vitamin c serum, brightening, kigali",
      "seoKeywordsRw": "serumu ya vitamini c, kuruhu",
      "whatsappShareText": "Gura iki gicuruzwa kuri FreedomCosmeticShop!",
      "weight": 500
    }
  ]
}`

interface ImportResultEntry {
  identifier: string
  status: 'updated' | 'unchanged' | 'failed' | 'not_found'
  matchedBy: 'sku' | 'realSku' | 'slug' | null
  product: { id: string; name: string; slug: string } | null
  updatedFields: string[]
  skippedFields: string[]
  warnings: string[]
  error: string | null
}

interface ImportResponse {
  success: boolean
  preview: boolean
  summary: {
    total: number
    matched: number
    notFound: number
    wouldUpdate: number
    unchanged: number
    failed: number
    applied?: number
    failedWrites?: number
  }
  results: ImportResultEntry[]
  error?: string
}

type Step = 'paste' | 'preview' | 'done'

export default function ProductBulkImport() {
  const t = useT()
  const [text, setText] = useState('')
  const [overwrite, setOverwrite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('paste')
  const [previewData, setPreviewData] = useState<ImportResponse | null>(null)
  const [results, setResults] = useState<ImportResponse | null>(null)

  const parsedCount = useMemo(() => {
    if (!text.trim()) return 0
    try {
      return parseImportJson(text).products.length
    } catch {
      return -1
    }
  }, [text])

  async function runImport(previewOnly: boolean) {
    setLoading(true)
    setError(null)
    try {
      // Local parse first: fail fast on invalid JSON without a round trip.
      const payload = parseImportJson(text)
      if (payload.products.length === 0) throw new ImportParseError('empty_products')
      const res = await fetch('/api/admin/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, preview: previewOnly, overwrite }),
      })
      const data = (await res.json().catch(() => null)) as ImportResponse | null
      if (!res.ok || !data || !data.success) {
        throw new Error(data?.error || (res.status === 401 ? t('admin_import.session_expired') : t('admin_import.import_error')))
      }
      if (previewOnly) {
        setPreviewData(data)
        setStep('preview')
      } else {
        setResults(data)
        setStep('done')
      }
    } catch (reason) {
      if (reason instanceof ImportParseError) {
        const message = reason.message
        if (message.startsWith('invalid_item:')) {
          const [, index, field] = message.split(':')
          setError(t('admin_import.invalid_item', { index: Number(index) + 1, field }))
        } else {
          setError(t(`admin_import.${message}`))
        }
      } else {
        setError(reason instanceof Error ? reason.message : t('admin_import.import_error'))
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setText('')
    setOverwrite(false)
    setError(null)
    setPreviewData(null)
    setResults(null)
    setStep('paste')
  }

  const displaySummary = results?.summary ?? previewData?.summary

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcs-text">{t('admin_import.title')}</h1>
        <p className="mt-1 text-sm leading-6 text-fcs-text-muted">{t('admin_import.subtitle')}</p>
      </div>

      {step === 'paste' && (
        <Card className="border-fcs-border bg-fcs-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fcs-text">
              <ClipboardPaste className="h-4 w-4 text-fcs-brand-text" aria-hidden="true" />
              {t('admin_import.paste_label')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bulk-import-json" className="text-fcs-text">
                {t('admin_import.json_label')}
              </Label>
              <Textarea
                id="bulk-import-json"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={PLACEHOLDER_JSON}
                rows={14}
                spellCheck={false}
                className="mt-2 min-h-[300px] font-mono text-xs leading-5"
              />
              <p className="mt-2 flex items-center justify-between text-xs text-fcs-text-muted" aria-live="polite">
                <span>{t('admin_import.characters', { count: text.length })}</span>
                <span className={parsedCount === -1 ? 'font-semibold text-fcs-error' : 'font-semibold text-fcs-success'}>
                  {parsedCount === -1 ? t('admin_import.invalid_json_hint') : parsedCount > 0 ? t('admin_import.products_parsed', { count: parsedCount }) : null}
                </span>
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-fcs-border-subtle bg-fcs-surface-secondary p-3">
              <Switch id="bulk-import-overwrite" checked={overwrite} onCheckedChange={setOverwrite} className="mt-0.5" />
              <div>
                <Label htmlFor="bulk-import-overwrite" className="text-sm font-semibold text-fcs-text">
                  {t('admin_import.overwrite_label')}
                </Label>
                <p className="mt-1 text-xs leading-5 text-fcs-text-muted">{t('admin_import.overwrite_hint')}</p>
              </div>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <Button
              type="button"
              onClick={() => runImport(true)}
              disabled={loading || parsedCount < 1}
              className="bg-fcs-brand-strong text-white hover:bg-fcs-brand-strong-hover disabled:bg-gray-300"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {t('admin_import.process')}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && previewData && (
        <Card className="border-fcs-border bg-fcs-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fcs-text">
              <Info className="h-4 w-4 text-fcs-info" aria-hidden="true" />
              {t('admin_import.preview_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryStrip summary={previewData.summary} preview />
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              {t('admin_import.confirm_warning')}
            </p>
            <PreviewList results={previewData.results} />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => runImport(false)}
                disabled={loading || previewData.summary.wouldUpdate === 0}
                className="bg-fcs-brand-strong text-white hover:bg-fcs-brand-strong-hover disabled:bg-gray-300"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {t('admin_import.confirm_import', { count: previewData.summary.wouldUpdate })}
              </Button>
              <Button type="button" variant="outline" onClick={reset} disabled={loading}>
                {t('admin_import.back')}
              </Button>
            </div>
            {error && <p role="alert" className="text-sm text-fcs-error">{error}</p>}
          </CardContent>
        </Card>
      )}

      {step === 'done' && results && (
        <Card className="border-fcs-border bg-fcs-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fcs-text">
              <CheckCircle2 className="h-4 w-4 text-fcs-success" aria-hidden="true" />
              {t('admin_import.results_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryStrip summary={results.summary} preview={false} />
            <PreviewList results={results.results} final />
            <Button type="button" variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('admin_import.new_import')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryStrip({ summary, preview }: { summary: NonNullable<ImportResponse['summary']>; preview: boolean }) {
  const t = useT()
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <SummaryCell label={t('admin_import.total')} value={String(summary.total)} tone="neutral" />
      <SummaryCell label={preview ? t('admin_import.will_update') : t('admin_import.updated')} value={String(preview ? summary.wouldUpdate : (summary.applied ?? summary.wouldUpdate))} tone="success" />
      <SummaryCell label={t('admin_import.no_changes')} value={String(summary.unchanged)} tone="neutral" />
      <SummaryCell label={t('admin_import.not_found')} value={String(summary.notFound + summary.failed)} tone={summary.notFound + summary.failed > 0 ? 'warning' : 'neutral'} />
    </div>
  )
}

function SummaryCell({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'success' | 'warning' }) {
  const toneClass = tone === 'success' ? 'text-fcs-success' : tone === 'warning' ? 'text-fcs-warning' : 'text-fcs-text'
  return (
    <div className="rounded-lg border border-fcs-border-subtle bg-fcs-surface-secondary p-3 text-center">
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-fcs-text-muted">{label}</p>
    </div>
  )
}

function PreviewList({ results, final = false }: { results: ImportResultEntry[]; final?: boolean }) {
  const t = useT()
  if (results.length === 0) return null
  return (
    <ul className="divide-y divide-fcs-border-subtle overflow-hidden rounded-lg border border-fcs-border-subtle bg-white">
      {results.map((result) => (
        <li key={result.identifier} className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={result.status} final={final} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fcs-text">
              {result.product?.name || result.identifier}
            </span>
            {result.product && (
              <span className="text-xs text-fcs-text-muted">
                {result.product.slug}
              </span>
            )}
          </div>
          {result.matchedBy && (
            <p className="mt-1 text-xs text-fcs-text-muted">
              {t('admin_import.matched_by')}: {result.matchedBy}
            </p>
          )}
          {result.updatedFields.length > 0 && (
            <p className="mt-2 text-xs leading-5 text-fcs-text-muted">
              <span className="font-semibold text-fcs-success">{t('admin_import.updated_fields')}:</span>{' '}
              {result.updatedFields.map((field) => (
                <Badge key={field} variant="outline" className="mr-1 border-emerald-200 bg-emerald-50 text-emerald-800">
                  {field}
                </Badge>
              ))}
            </p>
          )}
          {result.skippedFields.length > 0 && (
            <p className="mt-1 text-xs text-fcs-text-muted">
              <span className="font-semibold">{t('admin_import.skipped_fields')}:</span> {result.skippedFields.join(', ')}
            </p>
          )}
          {result.warnings.map((warning) => (
            <p key={warning} className="mt-1 flex items-start gap-1 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {warning}
            </p>
          ))}
          {result.error && (
            <p className="mt-1 flex items-start gap-1 text-xs text-fcs-error">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {result.error}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function StatusBadge({ status, final }: { status: ImportResultEntry['status']; final: boolean }) {
  const t = useT()
  if (final) {
    if (status === 'updated') return <Badge className="bg-emerald-100 text-emerald-800">{t('admin_import.updated')}</Badge>
    if (status === 'failed') return <Badge className="bg-red-100 text-red-800">{t('admin_import.failed')}</Badge>
  }
  if (status === 'updated') return <Badge className="bg-emerald-100 text-emerald-800">{t('admin_import.will_update')}</Badge>
  if (status === 'unchanged') return <Badge variant="outline" className="border-fcs-border text-fcs-text-muted">{t('admin_import.no_changes')}</Badge>
  if (status === 'not_found') return <Badge className="bg-amber-100 text-amber-800">{t('admin_import.not_found')}</Badge>
  if (status === 'failed') return <Badge className="bg-red-100 text-red-800">{t('admin_import.failed')}</Badge>
  return null
}
