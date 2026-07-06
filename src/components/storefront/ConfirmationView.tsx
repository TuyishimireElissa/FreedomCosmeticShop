"use client"

/**
 * Order confirmation view.
 *
 * Shown after a successful checkout. Loads the order by ID and displays:
 *  - Success banner with checkmark
 *  - Order number + status timeline
 *  - Customer + delivery info
 *  - Items + totals
 *  - Next steps (SMS updates, delivery ETA)
 *  - CTA: continue shopping / view admin (for demo)
 */

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Order } from "@/lib/types"
import { formatRWF, PAYMENT_METHODS, PaymentMethodKey } from "@/lib/format"
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
  const { goCatalog, goHome } = useStore()
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
        <p className="text-muted-foreground mt-2">
          We couldn&apos;t find this order. It may have been removed.
        </p>
        <Button className="mt-6" onClick={goHome}>
          Back to home
        </Button>
      </div>
    )
  }

  // Determine current step index for the timeline
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status)
  const isCancelled = order.status === "CANCELLED"

  const paymentMethod = order.paymentMethod as PaymentMethodKey
  const paymentLabel = PAYMENT_METHODS[paymentMethod]?.label || order.paymentMethod

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
        <p className="text-muted-foreground mt-2">
          We&apos;ve received your order and will contact you on{" "}
          <span className="text-foreground font-medium">{order.customerPhone}</span> to confirm.
        </p>
        <div className="bg-secondary mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5">
          <span className="text-muted-foreground text-xs tracking-wider uppercase">
            Order number
          </span>
          <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="bg-card mt-8 rounded-2xl border p-5">
          <h2 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
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
                    } ${isCurrent ? "ring-primary/20 ring-4" : ""}`}
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
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Estimated delivery:{" "}
            <span className="text-foreground font-medium">
              {order.province === "Kigali City" ? "1-2 business days" : "3-5 business days"}
            </span>
          </p>
        </div>
      )}

      {/* Customer + delivery info */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            Customer
          </h2>
          <p className="mt-2 font-medium">{order.customerName}</p>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5" />
            {order.customerPhone}
          </p>
          {order.customerEmail && (
            <p className="text-muted-foreground mt-1 text-sm">{order.customerEmail}</p>
          )}
        </div>
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            Delivery address
          </h2>
          <p className="mt-2 flex items-start gap-1.5 text-sm">
            <MapPin className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {order.address}
              <br />
              {order.city}, {order.province}
            </span>
          </p>
          {order.notes && (
            <p className="text-muted-foreground mt-2 text-xs italic">&ldquo;{order.notes}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Order items */}
      <div className="bg-card mt-6 rounded-2xl border p-5">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
          Items
        </h2>
        <ul className="mt-3 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="bg-secondary/30 h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-muted-foreground grid h-full w-full place-items-center text-xs">
                    —
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm leading-snug font-medium">{item.name}</p>
                <p className="text-muted-foreground text-xs">
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
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery fee</span>
            <span>{formatRWF(order.deliveryFee)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">{formatRWF(order.total)}</span>
          </div>
        </div>

        <div className="bg-secondary/40 mt-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm">
          <span className="text-muted-foreground">Payment</span>
          <span className="font-medium">
            {paymentLabel} ·{" "}
            <span
              className={order.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"}
            >
              {order.paymentStatus}
            </span>
          </span>
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-secondary/40 mt-6 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <MessageSquare className="text-primary mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">What happens next?</p>
            <p className="text-muted-foreground mt-1 text-sm">
              We&apos;ll send SMS updates to {order.customerPhone} as your order is confirmed,
              shipped, and delivered. If you have any questions, call us at{" "}
              <span className="text-foreground font-medium">+250 788 123 456</span>.
            </p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => goCatalog(null)} size="lg">
          Continue shopping
        </Button>
        <Button variant="outline" onClick={goHome} size="lg">
          Back to home
        </Button>
      </div>
    </div>
  )
}
