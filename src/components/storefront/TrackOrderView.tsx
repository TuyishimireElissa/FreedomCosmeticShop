"use client"

/**
 * TrackOrderView — track an order by order number.
 *
 * Features:
 *   - Input for order number (UB-2026-00001)
 *   - Loads order + timeline via /api/orders/[id]/track
 *   - Shows status timeline with timestamps
 *   - Shows items, delivery address, payment status
 *   - "Track another order" button
 *   - Recent order numbers from localStorage
 */

import { useState, useEffect, type FormEvent } from "react"
import { useStore } from "@/store/useStore"
import { formatRWF, PAYMENT_METHODS, PaymentMethodKey, deliveryTimeFor } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  Package,
  Truck,
  Home as HomeIcon,
  MapPinned,
  Search,
  ArrowLeft,
  Clock,
  Phone,
  MapPin,
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
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image: string | null
  }>
  paymentMethod: string
  paymentStatus: string
  deliveryStatus: string
  trackingCode: string | null
  estimatedArrival: string | null
  createdAt: string
  updatedAt: string
}

interface TimelineStep {
  status: string
  label: string
  timestamp: string | null
  completed: boolean
}

const TRACK_HISTORY_KEY = "ubumwe-track-history"
const MAX_HISTORY = 5

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING: CheckCircle2,
  CONFIRMED: Package,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: HomeIcon,
}

export function TrackOrderView() {
  const { goHome, goCatalog } = useStore()
  const [orderNumber, setOrderNumber] = useState("")
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [timeline, setTimeline] = useState<TimelineStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TRACK_HISTORY_KEY)
      setHistory(stored ? JSON.parse(stored) : [])
    } catch {
      setHistory([])
    }
  }, [])

  const saveToHistory = (num: string) => {
    const updated = [num, ...history.filter((h) => h !== num)].slice(0, MAX_HISTORY)
    setHistory(updated)
    localStorage.setItem(TRACK_HISTORY_KEY, JSON.stringify(updated))
  }

  const handleTrack = async (e: FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setLoading(true)
    setError(null)
    setOrder(null)

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber.trim())}/track`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Order not found")
        return
      }

      setOrder(data.order)
      setTimeline(data.timeline || [])
      saveToHistory(data.order.orderNumber)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleTrackFromHistory = (num: string) => {
    setOrderNumber(num)
    // Auto-submit
    setTimeout(() => {
      const form = document.getElementById("track-form") as HTMLFormElement | null
      form?.requestSubmit()
    }, 100)
  }

  const handleReset = () => {
    setOrder(null)
    setTimeline([])
    setOrderNumber("")
    setError(null)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <MapPinned className="h-6 w-6 text-primary" />
            Track your order
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your order number to see its status.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={goHome}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Home
        </Button>
      </div>

      {/* Search form */}
      {!order && (
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <form id="track-form" onSubmit={handleTrack} className="space-y-4">
            <div>
              <Label htmlFor="order-number">Order number</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="order-number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. UB-2026-00001"
                  className="pl-9 font-mono"
                  autoComplete="off"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your order number was sent via SMS and is in your confirmation email.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading || !orderNumber.trim()}>
              {loading ? <Skeleton className="h-5 w-20" /> : "Track order"}
            </Button>
          </form>

          {/* Recent searches */}
          {history.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recent orders
              </p>
              <div className="flex flex-wrap gap-2">
                {history.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleTrackFromHistory(num)}
                    className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-medium hover:bg-secondary/70"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => {
                    localStorage.removeItem(TRACK_HISTORY_KEY)
                    setHistory([])
                  }}
                  className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !order && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      )}

      {/* Order result */}
      {order && (
        <div className="space-y-4">
          {/* Status header */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Order number
                </p>
                <p className="font-mono text-lg font-bold">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    order.status === "DELIVERED"
                      ? "bg-emerald-100 text-emerald-700"
                      : order.status === "CANCELLED"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>

            {order.trackingCode && (
              <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Tracking code: </span>
                <span className="font-mono font-medium">{order.trackingCode}</span>
              </div>
            )}

            {order.estimatedArrival && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Estimated arrival:{" "}
                <span className="font-medium text-foreground">
                  {new Date(order.estimatedArrival).toLocaleDateString("en-RW", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Timeline */}
          {order.status !== "CANCELLED" && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Delivery timeline
              </h2>
              <ol className="relative space-y-4">
                {timeline.map((step, i) => {
                  const Icon = STATUS_ICONS[step.status] || CheckCircle2
                  return (
                    <li key={i} className="flex gap-3">
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                          step.completed
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`text-sm font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
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
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          {/* Items + delivery */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Delivery */}
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
                  {order.city}, {order.province}
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                ETA: {deliveryTimeFor(order.province)}
              </p>
            </div>

            {/* Payment */}
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Payment
              </h2>
              <p className="mt-2 font-medium">
                {PAYMENT_METHODS[order.paymentMethod as PaymentMethodKey]?.label || order.paymentMethod}
              </p>
              <p className="mt-1 text-sm">
                Status:{" "}
                <span
                  className={
                    order.paymentStatus === "PAID"
                      ? "font-medium text-emerald-600"
                      : "font-medium text-amber-600"
                  }
                >
                  {order.paymentStatus}
                </span>
              </p>
              <div className="mt-3 space-y-1 border-t pt-2 text-sm">
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
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Total</span>
                  <span>{formatRWF(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Items ({order.items.length})
            </h2>
            <ul className="mt-3 space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-secondary/30">
                    {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRWF(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatRWF(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Track another order
            </Button>
            <Button className="flex-1" onClick={goCatalog}>
              Continue shopping
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
