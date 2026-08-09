'use client'

/**
 * WhatsApp Orders dashboard.
 *
 * Read-only list + detail drawer. Every mutation reuses an existing guarded
 * endpoint rather than introducing a parallel write path:
 *   status  -> PATCH /api/orders/[id]                       (Phase 4a)
 *   payment -> POST  /api/admin/orders/[id]/record-payment  (Defect 2)
 *
 * Status buttons are derived from the same transition table the server
 * enforces, so the UI cannot offer a move the API will reject with 409.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle, Check, Copy, Loader2, MessageCircle, Package, RefreshCw, Search, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/lib/i18n/LanguageContext'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatRWF } from '@/lib/format'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/buildOrderMessage'
import { buildFollowUpMessage } from '@/lib/whatsapp/buildFollowUpMessage'
import { timeAgo } from '@/lib/whatsapp/relativeTime'

/** Mirrors ALLOWED_STATUS_TRANSITIONS in /api/orders/[id]. Kept in sync
 *  deliberately: offering a button the server refuses is worse than none. */
const NEXT_STATUS: Record<string, readonly string[]> = {
  PENDING_WHATSAPP: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
}

const STATUSES = ['PENDING_WHATSAPP', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] as const

/** Background tints only. Text colours are AA-verified against white. */
const STATUS_STYLE: Record<string, string> = {
  PENDING_WHATSAPP: 'bg-fcs-wheat/20 text-fcs-umber',
  CONFIRMED: 'bg-fcs-sage/20 text-fcs-umber',
  PROCESSING: 'bg-fcs-sky/25 text-fcs-text',
  SHIPPED: 'bg-fcs-brand/15 text-fcs-brand-text',
  DELIVERED: 'bg-fcs-sage/30 text-fcs-umber',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-fcs-surface-secondary text-fcs-text-muted',
}

const PAYMENT_METHODS = ['CASH', 'MTN_MOMO', 'AIRTEL_MONEY'] as const

interface OrderItem { id: string; name: string; price: number; quantity: number }
interface Payment { id: string; method: string; status: string; amount: number; completedAt: string | null }
interface Order {
  id: string; orderNumber: string; customerName: string; customerPhone: string; customerEmail: string | null
  address: string; city: string; district: string | null; sector: string | null; province: string
  notes: string | null; adminNotes: string | null
  subtotal: number; discountAmount: number; deliveryFee: number; total: number
  status: string; paymentMethod: string | null; paymentReceivedAt: string | null
  whatsappSentAt: string | null; createdAt: string
  items: OrderItem[]; payments: Payment[]
}
interface TimelineEntry { at: string; kind: string; label: string; detail?: string; actor?: string }


export default function WhatsAppOrdersView() {
  const t = useT()
  const { language } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [totalAll, setTotalAll] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState<string>('all')
  const [payment, setPayment] = useState<string>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)

  // Debounced so typing a reference does not fire a request per keystroke on a
  // 3G connection.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(id)
  }, [searchInput])

  const load = useCallback(async () => {
    setError(false)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (payment !== 'all') params.set('payment', payment)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/whatsapp-orders?${params.toString()}`)
      const body = await res.json()
      if (!res.ok || !body.success) throw new Error('load failed')
      setOrders(body.data.orders)
      setCounts(body.data.counts || {})
      setTotalAll(body.data.totalWhatsAppOrders || 0)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [status, payment, search])

  useEffect(() => { void load() }, [load])

  const filtersActive = status !== 'all' || payment !== 'all' || search !== ''

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-normal text-fcs-text sm:text-3xl">{t('whatsapp.orders_title')}</h1>
        <p className="mt-1 text-sm text-fcs-text-muted">{t('whatsapp.orders_subtitle')}</p>
      </header>

      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fcs-text-muted" aria-hidden="true" />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('whatsapp.orders_search')}
              aria-label={t('whatsapp.orders_search_label')}
              className="min-h-11 pl-9"
            />
          </div>
          <Button type="button" variant="outline" onClick={() => { setLoading(true); void load() }} className="min-h-11 px-3" aria-label={t('whatsapp.orders_retry')}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t('whatsapp.orders_filter_status')}>
          {(['all', ...STATUSES] as const).map((value) => {
            const active = status === value
            const count = value === 'all' ? totalAll : counts[value] || 0
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                aria-pressed={active}
                className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors motion-reduce:transition-none ${
                  active
                    ? 'border-fcs-brand-strong bg-fcs-brand-strong text-white'
                    : 'border-fcs-border bg-white text-fcs-text hover:bg-fcs-surface'
                }`}
              >
                {value === 'all' ? t('whatsapp.orders_all') : t(`whatsapp.status_${value}`)}
                <span className={active ? 'ml-1.5 opacity-90' : 'ml-1.5 text-fcs-text-muted'}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Payment state is not an order status, so it is a separate control. */}
        <div className="flex gap-2" role="group" aria-label={t('whatsapp.orders_filter_payment')}>
          {(['all', 'paid', 'unpaid'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPayment(value)}
              aria-pressed={payment === value}
              className={`min-h-9 rounded-fcs-md border px-3 text-xs font-semibold transition-colors motion-reduce:transition-none ${
                payment === value
                  ? 'border-fcs-umber bg-fcs-umber text-white'
                  : 'border-fcs-border bg-white text-fcs-text hover:bg-fcs-surface'
              }`}
            >
              {value === 'all' ? t('whatsapp.orders_all') : value === 'paid' ? t('whatsapp.orders_paid') : t('whatsapp.orders_unpaid')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2" aria-live="polite" aria-busy="true" aria-label={t('whatsapp.orders_loading')}>
          {[0, 1, 2].map((row) => <Skeleton key={row} className="h-20 w-full rounded-fcs-md" />)}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-fcs-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{t('whatsapp.orders_load_failed')}</p>
          <Button type="button" variant="outline" onClick={() => { setLoading(true); void load() }} className="mt-3 min-h-11">{t('whatsapp.orders_retry')}</Button>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState filtersActive={filtersActive} onClear={() => { setStatus('all'); setPayment('all'); setSearchInput(''); setSearch('') }} />
      ) : (
        <>
          <p className="mb-2 text-xs text-fcs-text-muted" aria-live="polite">{t('whatsapp.orders_count', { count: orders.length })}</p>
          <ul className="space-y-2">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderRow order={order} onOpen={() => setSelected(order)} t={t} />
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && (
        <OrderDetail
          order={selected}
          language={language === 'rw' ? 'rw' : 'en'}
          onClose={() => setSelected(null)}
          onChanged={() => { void load() }}
          t={t}
        />
      )}
    </div>
  )
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] || 'bg-fcs-surface-secondary text-fcs-text'}`}>
      {t(`whatsapp.status_${status}`)}
    </span>
  )
}

function OrderRow({ order, onOpen, t }: { order: Order; onOpen: () => void; t: (k: string, v?: Record<string, string | number>) => string }) {
  const paid = order.payments.some((payment) => payment.status === 'PAID')
  return (
    <div className="rounded-fcs-md border border-fcs-border bg-white p-3 transition-shadow hover:shadow-fcs-1 motion-reduce:transition-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-fcs-text">{order.orderNumber}</p>
          <p className="mt-0.5 truncate text-sm text-fcs-text">{order.customerName}</p>
          <p className="mt-0.5 text-xs text-fcs-text-muted">{order.customerPhone} · {order.district || order.province}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-fcs-text">{formatRWF(order.total)}</p>
          <p className="mt-0.5 text-xs text-fcs-text-muted">{timeAgo(order.createdAt, t)}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} t={t} />
        {paid && <span className="rounded-full bg-fcs-sage/25 px-2.5 py-0.5 text-xs font-semibold text-fcs-umber">{t('whatsapp.orders_paid')}</span>}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onOpen} className="min-h-11 px-3 text-xs">{t('whatsapp.orders_view')}</Button>
          <a
            href={`https://wa.me/${normalizeWhatsAppNumber(order.customerPhone)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('whatsapp.orders_chat')} — ${order.customerName}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-fcs-md bg-fcs-whatsapp px-3 text-xs font-semibold text-white transition-colors hover:bg-fcs-whatsapp-hover motion-reduce:transition-none"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('whatsapp.orders_chat')}</span>
          </a>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ filtersActive, onClear }: { filtersActive: boolean; onClear: () => void }) {
  const t = useT()
  return (
    <div className="rounded-fcs-lg border border-fcs-border bg-fcs-surface p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-fcs-brand/10" aria-hidden="true">
        <Package className="h-7 w-7 text-fcs-brand-text" />
      </span>
      <h2 className="mt-4 font-display text-xl font-normal text-fcs-text">
        {filtersActive ? t('whatsapp.orders_nomatch_title') : t('whatsapp.orders_empty_title')}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-fcs-text-muted">
        {filtersActive ? t('whatsapp.orders_nomatch_body') : t('whatsapp.orders_empty_body')}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtersActive ? (
          <Button type="button" variant="outline" onClick={onClear} className="min-h-11">{t('whatsapp.orders_clear')}</Button>
        ) : (
          <Link href="/" className="inline-flex min-h-11 items-center rounded-fcs-md border border-fcs-border bg-white px-4 text-sm font-semibold text-fcs-text hover:bg-fcs-surface">
            {t('whatsapp.orders_empty_shop')}
          </Link>
        )}
      </div>
    </div>
  )
}

function OrderDetail({
  order, language, onClose, onChanged, t,
}: {
  order: Order
  language: 'rw' | 'en'
  onClose: () => void
  onChanged: () => void
  t: (k: string, v?: Record<string, string | number>) => string
}) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null)
  const [hasAudit, setHasAudit] = useState(true)
  const [method, setMethod] = useState<string>('CASH')
  const [amount, setAmount] = useState<string>(String(order.total))
  const [reference, setReference] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [current, setCurrent] = useState(order)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/admin/orders/${order.id}/timeline`)
        const body = await res.json()
        if (!cancelled && res.ok && body.success) {
          setTimeline(body.data.entries)
          setHasAudit(body.data.hasAuditTrail)
        }
      } catch { if (!cancelled) setTimeline([]) }
    })()
    return () => { cancelled = true }
  }, [order.id])

  // Escape closes, matching the Sheet primitive used elsewhere in admin.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const paidAlready = current.payments.some((payment) => payment.status === 'PAID')
  const nextStatuses = NEXT_STATUS[current.status] || []

  const message = useMemo(
    () => buildFollowUpMessage({
      orderNumber: current.orderNumber,
      customerName: current.customerName,
      address: current.address,
      district: current.district,
      sector: current.sector,
      items: current.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
      total: current.total,
      language,
    }),
    [current, language],
  )

  async function changeStatus(next: string) {
    setBusy(true); setActionError(null)
    try {
      const res = await fetch(`/api/orders/${current.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }),
      })
      const body = await res.json()
      if (!res.ok) { setActionError(body.error || t('whatsapp.action_failed')); return }
      setCurrent((prev) => ({ ...prev, status: next }))
      onChanged()
    } catch { setActionError(t('whatsapp.action_failed')) } finally { setBusy(false) }
  }

  async function recordPayment() {
    setBusy(true); setActionError(null)
    try {
      const res = await fetch(`/api/admin/orders/${current.id}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, amount: Number(amount), reference: reference || undefined }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        setActionError(
          body.error === 'AMOUNT_MISMATCH'
            ? t('whatsapp.detail_payment_mismatch', { total: formatRWF(current.total) })
            : body.error || t('whatsapp.action_failed'),
        )
        return
      }
      setPaymentDone(true)
      setCurrent((prev) => ({
        ...prev,
        payments: [...prev.payments, { id: body.data.paymentId, method: body.data.method, status: 'PAID', amount: body.data.amount, completedAt: body.data.recordedAt }],
      }))
      onChanged()
    } catch { setActionError(t('whatsapp.action_failed')) } finally { setBusy(false) }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { setActionError(t('whatsapp.orders_copy_failed')) }
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/50" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('whatsapp.detail_title', { reference: current.orderNumber })}
        onClick={(event) => event.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto overscroll-contain bg-white p-4 shadow-fcs-4 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-mono text-lg font-bold text-fcs-text">{current.orderNumber}</h2>
            <div className="mt-1.5"><StatusBadge status={current.status} t={t} /></div>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} aria-label={t('whatsapp.detail_close')} className="min-h-11 min-w-11 shrink-0 px-2">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {actionError && (
          <p role="alert" aria-live="assertive" className="mb-4 flex items-start gap-2 rounded-fcs-md bg-red-50 p-3 text-sm font-semibold text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{actionError}
          </p>
        )}

        <section className="mb-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('whatsapp.detail_customer')}</h3>
          <p className="text-sm font-semibold text-fcs-text">{current.customerName}</p>
          <p className="text-sm text-fcs-text">{current.customerPhone}</p>
          {current.customerEmail && <p className="text-sm text-fcs-text-muted">{current.customerEmail}</p>}
          <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('whatsapp.detail_delivery')}</h3>
          <p className="text-sm leading-6 text-fcs-text">
            {[current.address, current.sector, current.district, current.province].filter(Boolean).join(', ')}
          </p>
          {current.notes && <p className="mt-1 text-sm italic text-fcs-text-muted">{current.notes}</p>}
        </section>

        <section className="mb-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('whatsapp.detail_items')}</h3>
          <ul className="space-y-2">
            {current.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-fcs-border pb-2 text-sm">
                <span className="min-w-0 text-fcs-text">
                  <span className="block truncate">{item.name}</span>
                  <span className="text-xs text-fcs-text-muted">{t('whatsapp.detail_qty')} {item.quantity} × {formatRWF(item.price)}</span>
                </span>
                <span className="shrink-0 font-semibold text-fcs-text">{formatRWF(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-fcs-text-muted">{t('whatsapp.detail_subtotal')}</dt><dd className="text-fcs-text">{formatRWF(current.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-fcs-text-muted">{t('whatsapp.detail_delivery_fee')}</dt><dd className="text-fcs-text">{formatRWF(current.deliveryFee)}</dd></div>
            {current.discountAmount > 0 && (
              <div className="flex justify-between"><dt className="text-fcs-text-muted">{t('whatsapp.detail_discount')}</dt><dd className="text-fcs-text">− {formatRWF(current.discountAmount)}</dd></div>
            )}
            <div className="flex justify-between border-t border-fcs-border pt-1.5 text-base font-bold">
              <dt className="text-fcs-text">{t('whatsapp.detail_grand_total')}</dt><dd className="text-fcs-text">{formatRWF(current.total)}</dd>
            </div>
          </dl>
        </section>

        <section className="mb-5 grid gap-2 sm:grid-cols-2">
          <a
            href={`https://wa.me/${normalizeWhatsAppNumber(current.customerPhone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-fcs-md bg-fcs-whatsapp px-4 text-sm font-semibold text-white transition-colors hover:bg-fcs-whatsapp-hover motion-reduce:transition-none"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />{t('whatsapp.orders_chat')}
          </a>
          <button
            type="button"
            onClick={copyMessage}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-fcs-md border border-fcs-border bg-white px-4 text-sm font-semibold text-fcs-text hover:bg-fcs-surface"
          >
            {copied ? <Check className="h-4 w-4 text-fcs-whatsapp" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? t('whatsapp.orders_copied') : t('whatsapp.orders_copy')}
          </button>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('whatsapp.detail_status_change')}</h3>
          {nextStatuses.length === 0 ? (
            <p className="text-sm text-fcs-text-muted">{t('whatsapp.detail_status_none')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((next) => (
                <Button key={next} type="button" variant="outline" disabled={busy} onClick={() => changeStatus(next)} className="min-h-11">
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                  {t(`whatsapp.status_${next}`)}
                </Button>
              ))}
            </div>
          )}
        </section>

        <section className="mb-5 rounded-fcs-md border border-fcs-border bg-fcs-surface p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('whatsapp.detail_payment_existing')}</h3>
          {current.payments.length === 0 ? (
            <p className="text-sm text-fcs-text-muted">{t('whatsapp.detail_payment_none')}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {current.payments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-2">
                  <span className="text-fcs-text">{payment.method} · {payment.status}</span>
                  <span className="font-semibold text-fcs-text">{formatRWF(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          {!paidAlready && !paymentDone && (
            <div className="mt-3 space-y-2.5 border-t border-fcs-border pt-3">
              <h4 className="text-sm font-semibold text-fcs-text">{t('whatsapp.detail_payment')}</h4>
              <div>
                <label htmlFor="wa-method" className="mb-1 block text-xs font-semibold text-fcs-text">{t('whatsapp.detail_payment_method')}</label>
                <select
                  id="wa-method"
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className="min-h-11 w-full rounded-fcs-md border border-fcs-border bg-white px-3 text-sm text-fcs-text"
                >
                  {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="wa-amount" className="mb-1 block text-xs font-semibold text-fcs-text">{t('whatsapp.detail_payment_amount')}</label>
                <Input id="wa-amount" type="number" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-h-11" />
              </div>
              <div>
                <label htmlFor="wa-ref" className="mb-1 block text-xs font-semibold text-fcs-text">{t('whatsapp.detail_payment_reference')}</label>
                <Input id="wa-ref" value={reference} onChange={(event) => setReference(event.target.value)} className="min-h-11" />
              </div>
              <Button type="button" disabled={busy} onClick={recordPayment} className="min-h-12 w-full bg-fcs-brand-strong text-white hover:bg-fcs-brand-strong-hover">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                {t('whatsapp.detail_payment_submit')}
              </Button>
            </div>
          )}
          {paymentDone && (
            <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm font-semibold text-fcs-umber">
              <Check className="h-4 w-4" aria-hidden="true" />{t('whatsapp.detail_payment_recorded')}
            </p>
          )}
        </section>

        <section className="mb-2">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('whatsapp.detail_timeline')}</h3>
          {timeline === null ? (
            <Skeleton className="h-16 w-full" />
          ) : timeline.length === 0 ? (
            <p className="text-sm text-fcs-text-muted">{t('whatsapp.detail_timeline_empty')}</p>
          ) : (
            <>
              <ol className="space-y-2">
                {timeline.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="flex gap-2.5 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fcs-brand" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-fcs-text">{entry.detail || entry.label}</span>
                      <span className="block text-xs text-fcs-text-muted">
                        {new Date(entry.at).toLocaleString('en-RW', { timeZone: 'Africa/Kigali' })}
                        {entry.actor ? ` · ${entry.actor}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              {!hasAudit && <p className="mt-2 text-xs italic text-fcs-text-muted">{t('whatsapp.detail_timeline_partial')}</p>}
            </>
          )}
          {current.adminNotes && (
            <>
              <h3 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('whatsapp.detail_notes')}</h3>
              <p className="whitespace-pre-line text-sm text-fcs-text">{current.adminNotes}</p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
