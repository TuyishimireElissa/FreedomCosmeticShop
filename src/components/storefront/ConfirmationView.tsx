"use client"

/**
 * Order confirmation view — shown after a successful checkout.
 *
 * Features:
 *   - Success banner with checkmark
 *   - Order number + status timeline
 *   - Customer + delivery info
 *   - Items + totals
 *   - Payment status
 *   - Estimated delivery time
 *   - WhatsApp message with order details
 *   - 'Track Order' button
 *   - Share order on WhatsApp
 *   - Next steps
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
  MessageSquare,
  MapPinned,
  Share2,
  Clock,
} from "lucide-react"

interface ConfirmationViewProps {
  orderId: string
}

const STATUS_STEPS = [
  { key: "PENDING", label: "Order placed", icon: CheckCircle2 },
  { key: "CONFIRMED", label: "Confirmed", icon: Package },
  { key: "SHIPPED", label: "Shipped", icon: Truck },
  { key: "DELIVERED", label: "Delivered", icon: HomeIcon },
]

export function ConfirmationView({ orderId }: ConfirmationViewProps) {
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
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find this order. It may have been removed.
        </p>
        <Button className="mt-6" onClick={goHome}>Back to home</Button>
      </div>
    )
  }

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status)
  const isCancelled = order.status === "CANCELLED"

  const paymentMethod = order.paymentMethod as PaymentMethodKey
  const paymentLabel = PAYMENT_METHODS[paymentMethod]?.label || order.paymentMethod

  // ─── WhatsApp share ─────────────────────────────────────────────
  const buildWhatsAppMessage = () => {
    const lines = order.items.map(
      (i) => `• ${i.name} × ${i.quantity} — ${formatRWF(i.price * i.quantity)}`
    )
    return `🛍️ Ubumwe Beauty Order ${order.orderNumber}\n\n${lines.join("\n")}\n\nTotal: ${formatRWF(order.total)}\nPayment: ${paymentLabel}\nDelivery to: ${order.address}, ${order.city}, ${order.province}\n\nTrack at ubumwe.beauty`
  }

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage())}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleSendToMyPhone = () => {
    // Send order details to customer's phone via WhatsApp
    const phone = order.customerPhone.replace(/[^\d]/g, "")
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage())}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Success banner */}
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          {isCancelled ? "Order cancelled" : "Thank you for your order!"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          We&apos;ve received your order and will contact you on{" "}
          <span className="font-medium text-foreground">{order.customerPhone}</span>{" "}
          to confirm.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Order number
          </span>
          <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Button variant="outline" onClick={() => goTrackOrder(order.orderNumber)} className="gap-2">
          <MapPinned className="h-4 w-4" /> Track Order
        </Button>
        <Button variant="outline" onClick={handleShareWhatsApp} className="gap-2">
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button variant="outline" onClick={handleSendToMyPhone} className="gap-2 col-span-2 sm:col-span-1">
          <MessageSquare className="h-4 w-4" /> Send to my phone
        </Button>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="mt-8 rounded-2xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Order status
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
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Estimated delivery:{" "}
            <span className="font-medium text-foreground">
              {deliveryTimeFor(order.province)}
            </span>
          </div>
        </div>
      )}

      {/* Customer + delivery info */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Customer
          </h2>
          <p className="mt-2 font-medium">{order.customerName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {order.customerPhone}
          </p>
          {order.customerEmail && (
            <p className="mt-1 text-sm text-muted-foreground">{order.customerEmail}</p>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Delivery address
          </h2>
          <p className="mt-2 flex items-start gap-1.5 text-sm">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              {order.address}
              <br />
              {order.city}, {order.province}
            </span>
          </p>
          {order.notes && (
            <p className="mt-2 text-xs italic text-muted-foreground">&ldquo;{order.notes}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Order items */}
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Items
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
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatRWF(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>−{formatRWF(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery fee</span>
            <span>{formatRWF(order.deliveryFee)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">{formatRWF(order.total)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Payment</span>
          <span className="font-medium">
            {paymentLabel} ·{" "}
            <span
              className={
                order.paymentStatus === "PAID"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            >
              {order.paymentStatus}
            </span>
          </span>
        </div>
      </div>

      {/* Next steps */}
      <div className="mt-6 rounded-2xl bg-secondary/40 p-5">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">What happens next?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll send SMS updates to {order.customerPhone} as your order is
              confirmed, shipped, and delivered. If you have any questions, call us at{" "}
              <span className="font-medium text-foreground">+250 788 123 456</span>.
            </p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => goCatalog(null)} size="lg">Continue shopping</Button>
        <Button variant="outline" onClick={goHome} size="lg">Back to home</Button>
      </div>
    </div>
  )
}
