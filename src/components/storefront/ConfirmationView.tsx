"use client"

/**
 * ConfirmationView — order confirmation page.
 *
 * Features:
 *   - Success banner with checkmark
 *   - Order number + status timeline
 *   - Customer + delivery info
 *   - Items + totals (with coupon + loyalty breakdown)
 *   - Payment status
 *   - Estimated delivery time
 *   - WhatsApp share order (share with friend)
 *   - Track Order button → navigates to TrackOrderView
 *   - Continue shopping CTA
 */

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Order } from "@/lib/types"
import { formatRWF, PAYMENT_METHODS, PaymentMethodKey, deliveryTimeFor } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  Package,
  Truck,
  Home as HomeIcon,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
  ArrowRight,
  Share2,
} from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'

interface ConfirmationViewProps {
  orderId: string
}

const STATUS_STEPS = [
  { key: "PENDING", label: "orders.step_placed", icon: CheckCircle2 },
  { key: "CONFIRMED", label: "orders.status_confirmed", icon: Package },
  { key: "SHIPPED", label: "orders.status_shipped", icon: Truck },
  { key: "DELIVERED", label: "orders.status_delivered", icon: HomeIcon },
]

export function ConfirmationView({ orderId }: ConfirmationViewProps) {
  const t = useT()
  const { goCatalog, goHome, goTrackOrder } = useStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`)
        if (!res.ok) throw new Error("Order not found")
        const data = await res.json()
        if (cancelled) return
        setOrder(data.order)
      } catch (e) {
        console.error("Failed to load order:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId])

  // ─── WhatsApp share order ─────────────────────────────────────────
  const handleShareOrder = () => {
    if (!order) return
    const items = order.items
      .map((i) => `• ${i.name} × ${i.quantity} — ${formatRWF(i.price * i.quantity)}`)
      .join("\n")
    const message = t('checkout.order_share_message', { order: order.orderNumber, items, total: formatRWF(order.total), payment: PAYMENT_METHODS[order.paymentMethod as PaymentMethodKey]?.label || order.paymentMethod, status: order.status })
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="mx-auto h-24 w-24 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-8 w-64" />
        <Skeleton className="mx-auto mt-2 h-4 w-48" />
        <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t('checkout.order_not_found')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('checkout.order_not_found_hint')}
        </p>
        <Button className="mt-6" onClick={goHome}>
          {t('checkout.back_home')}
        </Button>
      </div>
    )
  }

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status)
  const isCancelled = order.status === "CANCELLED"
  const paymentMethod = order.paymentMethod as PaymentMethodKey
  const paymentLabel = PAYMENT_METHODS[paymentMethod]?.label || order.paymentMethod
  const estimatedDelivery = deliveryTimeFor(order.province)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Success banner ──────────────────────────────────────────── */}
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          {isCancelled ? t('checkout.order_cancelled') : t('checkout.thank_you_order')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('checkout.received_contact_prefix')} {" "}
          <span className="font-medium text-foreground">{order.customerPhone}</span> {t('checkout.to_confirm')}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('checkout.order_number')}
          </span>
          <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
        </div>
      </div>

      {/* ─── Status timeline ─────────────────────────────────────────── */}
      {!isCancelled && (
        <div className="mt-8 rounded-2xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('checkout.order_status')}
          </h2>
          <ol className="grid grid-cols-4 gap-2 sm:gap-4">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIdx
              const isCurrent = i === currentStepIdx
              return (
                <li key={step.key} className="flex flex-col items-center text-center">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-colors sm:h-12 sm:w-12 ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`mt-2 text-[10px] font-medium sm:text-xs ${
                      done ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {t(step.label)}
                  </span>
                </li>
              )
            })}
          </ol>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-secondary/40 p-3 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{t('checkout.estimated_delivery_label')}</span>
            <span className="font-medium">{estimatedDelivery}</span>
          </div>
        </div>
      )}

      {/* ─── Customer + delivery ─────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('checkout.customer')}
          </h2>
          <p className="mt-2 font-medium">{order.customerName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
          </p>
          {order.customerEmail && (
            <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('checkout.step_address')}
          </h2>
          <p className="mt-2 flex items-start gap-1.5 text-sm">
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
          {order.notes && (
            <p className="mt-2 text-xs italic text-muted-foreground">&ldquo;{order.notes}&rdquo;</p>
          )}
        </div>
      </div>

      {/* ─── Order items ─────────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('checkout.items_label')}
        </h2>
        <ul className="mt-3 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary/30">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">—</div>
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

        {/* Totals */}
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
            <span className="text-muted-foreground">{t('checkout.delivery_fee')}</span>
            <span>{formatRWF(order.deliveryFee)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <span className="font-semibold">{t('cart.total')}</span>
            <span className="text-xl font-bold">{formatRWF(order.total)}</span>
          </div>
        </div>

        {/* Payment status */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">{t('checkout.step_payment')}</span>
          <span className="font-medium">
            {paymentLabel} ·{" "}
            <span
              className={
                order.paymentStatus === "PAID"
                  ? "text-emerald-600"
                  : order.paymentStatus === "FAILED"
                  ? "text-destructive"
                  : "text-amber-600"
              }
            >
              {order.paymentStatus}
            </span>
          </span>
        </div>
      </div>

      {/* ─── Next steps ──────────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl bg-secondary/40 p-5">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">{t('checkout.what_next')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('checkout.sms_updates_next', { phone: order.customerPhone })} {t('checkout.questions_call')} {" "}
              <span className="font-medium text-foreground">+250 788 123 456</span>.
            </p>
          </div>
        </div>
      </div>

      {/* ─── CTAs ────────────────────────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => goTrackOrder(order.orderNumber)} size="lg">
            <Package className="mr-2 h-5 w-5" /> {t('checkout.track_order')}
          </Button>
          <Button variant="outline" size="lg" onClick={handleShareOrder}>
            <Share2 className="mr-2 h-5 w-5" /> {t('checkout.share_order')}
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => goCatalog(null)}>
          {t('checkout.continue_shopping')} <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
