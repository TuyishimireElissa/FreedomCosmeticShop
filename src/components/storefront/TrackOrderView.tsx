"use client"

/**
 * TrackOrderView — track an order by order number.
 *
 * Features:
 *   - Input for order number (e.g., UB-2026-00001)
 *   - Shows order status timeline
 *   - Shows items, totals, delivery info
 *   - Shows payment status
 *   - Estimated delivery time
 *   - WhatsApp share order
 */

import { useState } from "react"
import { useStore } from "@/store/useStore"
import { formatRWF, PAYMENT_METHODS, PaymentMethodKey, deliveryTimeFor } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildWhatsAppShareUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'
import { useOrderUpdates, useDeliveryUpdates } from "@/hooks/use-realtime"
import OrderStatusBadge from '@/components/a11y/OrderStatusBadge'
import PaymentStatusBadge from '@/components/a11y/PaymentStatusBadge'
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Home as HomeIcon,
  Clock,
  Phone,
  MapPin,
  Share2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react"

interface TrackedOrder {
  id: string
  orderNumber: string
  status: string
  customerName: string
  customerPhone: string
  address: string
  city: string
  district: string | null
  sector: string | null
  province: string
  total: number
  subtotal: number
  deliveryFee: number
  discountAmount: number
  paymentMethod: string
  paymentStatus: string
  deliveryStatus: string
  trackingCode: string | null
  estimatedArrival: string | null
  createdAt: string
  updatedAt: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image: string | null
  }>
}

interface TimelineStep {
  status: string
  label: string
  timestamp: string | null
  completed: boolean
}

export function TrackOrderView() {
  const { goHome } = useStore()
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [orderNumber, setOrderNumber] = useState("")
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [timeline, setTimeline] = useState<TimelineStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim()) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber.trim())}/track`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('checkout.order_not_found'))
      }
      const data = await res.json()
      setOrder(data.order)
      setTimeline(data.timeline || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orders.track_failed'))
      setOrder(null)
      setTimeline([])
    } finally {
      setLoading(false)
    }
  }

  // ─── Section 3: Real-time order status updates ─────────────────────
  // When admin changes the order status (confirm/ship/deliver/cancel),
  // update the tracking page live without requiring the customer to refresh.
  // Only reacts to events for the currently-tracked order.
  useOrderUpdates((event, data) => {
    if (!order) return
    const o = data as { id: string; orderNumber: string; status: string }

    // Only react to events for THIS order
    if (o.orderNumber !== order.orderNumber && o.id !== order.id) return

    if (event.startsWith("order:") && event !== "order:new") {
      // Update the order status live
      setOrder((prev) => (prev ? { ...prev, status: o.status } : prev))

      // Show a toast notification for the status change
      const statusMessages: Record<string, string> = {
        confirmed: ` ${t('orders.realtime_confirmed')}`,
        processing: ` ${t('orders.realtime_processing')}`,
        shipped: ` ${t('orders.realtime_shipped')}`,
        delivered: ` ${t('orders.realtime_delivered')}`,
        cancelled: ` ${t('orders.realtime_cancelled')}`,
      }
      const action = event.replace("order:", "")
      const message = statusMessages[action]
      if (message) {
        toast({ title: t('orders.order_update'), description: message })
      }

      // If shipped or delivered, refetch the full order to get rider info + timeline
      if (event === "order:shipped" || event === "order:delivered") {
        fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}/track`)
          .then((r) => r.json())
          .then((d) => {
            if (d.order) {
              setOrder(d.order)
              setTimeline(d.timeline || [])
            }
          })
          .catch(() => {})
      }
    }
  })

  // ─── Section 7: Real-time rider assignment updates ──────────────────
  // When admin assigns a rider to this order, refetch the order to show
  // the rider's name + phone (tap-to-call) + updated ETA instantly.
  useDeliveryUpdates((event, data) => {
    if (!order) return
    const d = data as { orderId: string; orderNumber: string; riderName?: string; riderPhone?: string }

    // Only react to events for THIS order
    if (d.orderNumber !== order.orderNumber && d.orderId !== order.id) return

    if (event === "delivery:assigned") {
      // Rider just assigned — refetch to get rider info + show toast
      fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}/track`)
        .then((r) => r.json())
        .then((data) => {
          if (data.order) {
            setOrder(data.order)
            setTimeline(data.timeline || [])
          }
        })
        .catch(() => {})
      toast({
        title: ` ${t('orders.rider_assigned')}`,
        description: d.riderName
          ? `${d.riderName} — ${d.riderPhone || t('orders.phone_pending')}`
          : t('orders.on_the_way'),
      })
    } else if (event === "delivery:updated") {
      // General delivery update — refetch to get latest status
      fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}/track`)
        .then((r) => r.json())
        .then((data) => {
          if (data.order) {
            setOrder(data.order)
            setTimeline(data.timeline || [])
          }
        })
        .catch(() => {})
    }
  })

  // ─── WhatsApp share ───────────────────────────────────────────────
  const handleShare = () => {
    if (!order) return
    const items = order.items
      .map((i) => `• ${i.name} × ${i.quantity}`)
      .join("\n")
    const msg = t('orders.share_tracking_message', { order: order.orderNumber, status: order.status, items, total: formatRWF(order.total) })
    window.open(buildWhatsAppShareUrl(msg), '_blank', 'noopener,noreferrer')
    trackWhatsAppClick('track_order', { language: language === 'en' ? 'en' : 'rw', pagePath: '/track-order' })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Package className="h-7 w-7 text-primary" /> {t('orders.track')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('orders.enter_number_status')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={goHome}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('nav.home')}
        </Button>
      </div>

      {/* Search form */}
      <form onSubmit={handleTrack} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="e.g. UB-2026-00001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="h-12 pl-9 font-mono"
              autoComplete="off"
            />
          </div>
          <Button type="submit" size="lg" disabled={loading || !orderNumber.trim()}>
            {loading ? t('common.loading') : t('orders.track')}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('orders.number_sent_sms')}
        </p>
      </form>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive/50" />
          <h3 className="mt-3 font-semibold text-destructive">{t('checkout.order_not_found')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('orders.number_format_hint')}
          </p>
        </div>
      )}

      {/* Order details */}
      {order && !loading && (
        <div className="space-y-4">
          {/* Status banner */}
          <div
            className={`rounded-2xl border p-5 ${
              order.status === "DELIVERED"
                ? "border-emerald-300 bg-emerald-50"
                : order.status === "CANCELLED"
                ? "border-destructive/30 bg-destructive/5"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('orders.order_label')}</p>
                <p className="font-mono text-lg font-bold">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('orders.status_label')}</p>
                <OrderStatusBadge status={order.status} className="mt-1" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{t('orders.placed_label')}</span>
              <span className="font-medium">
                {new Date(order.createdAt).toLocaleString("en-RW", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{t('checkout.delivery_time')}:</span>
                <span className="font-medium">{deliveryTimeFor(order.province)}</span>
              </div>
            )}
            {order.trackingCode && (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">{t('orders.tracking_code')}: </span>
                <span className="font-mono font-medium">{order.trackingCode}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          {order.status !== "CANCELLED" && timeline.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('orders.timeline')}
              </h2>
              <ol className="space-y-4">
                {timeline.map((step, i) => {
                  const StepIcon =
                    step.status === "DELIVERED"
                      ? HomeIcon
                      : step.status === "SHIPPED"
                      ? Truck
                      : step.status === "PENDING"
                      ? CheckCircle2
                      : Package
                  return (
                    <li key={step.status} className="flex items-start gap-3">
                      <div
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                          step.completed
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <StepIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${step.completed ? "" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {step.timestamp && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(step.timestamp).toLocaleString("en-RW", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                      {i === timeline.length - 1 && step.completed && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {t('orders.current')}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          {/* Items + totals */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('checkout.items_count', { count: order.items.length })}
            </h2>
            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary/30">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-snug">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRWF(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatRWF(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                <span>{formatRWF(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{t('cart.discount')}</span>
                  <span>−{formatRWF(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('cart.delivery')}</span>
                <span>{formatRWF(order.deliveryFee)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="font-semibold">{t('cart.total')}</span>
                <span className="text-xl font-bold">{formatRWF(order.total)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-2 text-sm">
              <span className="text-muted-foreground">{t('checkout.step_payment')}</span>
              <span className="flex flex-wrap items-center justify-end gap-2 font-medium">
                <span>{PAYMENT_METHODS[order.paymentMethod as PaymentMethodKey]?.label || order.paymentMethod}</span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </span>
            </div>
          </div>

          {/* Delivery info */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('checkout.step_address')}
            </h2>
            <p className="mt-2 font-medium">{order.customerName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                {order.address}
                <br />
                {order.city}
                {order.district ? `, ${order.district}` : ""}
                <br />
                {order.province}
              </span>
            </p>
          </div>

          {/* Share */}
          <Button variant="outline" className="w-full" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> {t('checkout.share_order')}
          </Button>
        </div>
      )}

      {/* Empty state (before search) */}
      {!searched && !order && !loading && (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-3 font-semibold">{t('orders.track')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('orders.tracking_empty_hint')}
          </p>
        </div>
      )}
    </div>
  )
}
