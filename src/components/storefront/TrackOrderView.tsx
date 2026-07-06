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
        throw new Error(data.error || "Order not found")
      }
      const data = await res.json()
      setOrder(data.order)
      setTimeline(data.timeline || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to track order")
      setOrder(null)
      setTimeline([])
    } finally {
      setLoading(false)
    }
  }

  // ─── WhatsApp share ───────────────────────────────────────────────
  const handleShare = () => {
    if (!order) return
    const items = order.items
      .map((i) => `• ${i.name} × ${i.quantity}`)
      .join("\n")
    const msg = `📦 Order ${order.orderNumber} status: ${order.status}\n\n${items}\n\nTotal: ${formatRWF(order.total)}\nTrack at ubumwe.beauty 🌸`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Package className="h-7 w-7 text-primary" /> Track your order
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your order number to see the latest status.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={goHome}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Home
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
            {loading ? "Tracking..." : "Track"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Your order number was sent via SMS when you placed your order.
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
          <h3 className="mt-3 font-semibold text-destructive">Order not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Double-check your order number — it looks like UB-YYYY-NNNNN.
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
                <p className="text-sm text-muted-foreground">Order</p>
                <p className="font-mono text-lg font-bold">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <p
                  className={`text-lg font-bold ${
                    order.status === "DELIVERED"
                      ? "text-emerald-700"
                      : order.status === "CANCELLED"
                      ? "text-destructive"
                      : "text-primary"
                  }`}
                >
                  {order.status}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Placed on</span>
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
                <span className="text-muted-foreground">Estimated delivery:</span>
                <span className="font-medium">{deliveryTimeFor(order.province)}</span>
              </div>
            )}
            {order.trackingCode && (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Tracking code: </span>
                <span className="font-mono font-medium">{order.trackingCode}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          {order.status !== "CANCELLED" && timeline.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Order timeline
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
                          Current
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
              Items ({order.items.length})
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
                <span className="text-muted-foreground">Delivery</span>
                <span>{formatRWF(order.deliveryFee)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatRWF(order.total)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-2 text-sm">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium">
                {PAYMENT_METHODS[order.paymentMethod as PaymentMethodKey]?.label || order.paymentMethod}{" "}
                · <span className={order.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"}>{order.paymentStatus}</span>
              </span>
            </div>
          </div>

          {/* Delivery info */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery to
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
            <Share2 className="mr-2 h-4 w-4" /> Share order on WhatsApp
          </Button>
        </div>
      )}

      {/* Empty state (before search) */}
      {!searched && !order && !loading && (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-3 font-semibold">Enter your order number above</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll see the full status timeline, items, and delivery info.
          </p>
        </div>
      )}
    </div>
  )
}
