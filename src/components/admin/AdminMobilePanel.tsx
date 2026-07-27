"use client"

/**
 * AdminMobilePanel — mobile-optimized admin mini-panel.
 *
 * Section 12: Mobile App Connection
 *
 * A touch-friendly, compact admin dashboard for mobile browsers.
 * Shows:
 *   - Today's revenue + order count + active visitors
 *   - Pending orders with one-tap Confirm button
 *   - Quick Ship action (with rider name/phone input)
 *   - Low stock alerts
 *   - Quick SMS send
 *
 * Accessible via the Staff tab on mobile, or directly at /?view=admin
 * on a mobile browser.
 *
 * Uses the /api/mobile/admin/* endpoints (compact payloads).
 * Auto-refreshes every 10 seconds.
 */

import { useEffect, useState, useCallback } from "react"
import { useStore } from "@/store/useStore"
import { formatRWF, formatRWFCompact } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import {
  TrendingUp,
  Package,
  Users,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Send,
  RefreshCw,
  Phone,
  ArrowLeft,
  Loader2,
} from "lucide-react"

interface MobileDashboard {
  summary: {
    todayRevenue: number
    todayOrderCount: number
    pendingCount: number
    lowStockCount: number
    activeVisitors: number
  }
  pendingOrders: Array<{
    id: string
    orderNumber: string
    customerName: string
    customerPhone: string
    total: number
    items: string
    itemCount: number
    createdAt: string
  }>
  lowStock: Array<{
    id: string
    name: string
    stock: number
    image: string | null
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    customerName: string
    total: number
    status: string
    createdAt: string
  }>
}

export function AdminMobilePanel() {
  const t = useT()
  const { goHome } = useStore()
  const { toast } = useToast()
  const [data, setData] = useState<MobileDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Ship modal state
  const [shipOrderId, setShipOrderId] = useState<string | null>(null)
  const [riderName, setRiderName] = useState("")
  const [riderPhone, setRiderPhone] = useState("")

  // SMS modal state
  const [smsOpen, setSmsOpen] = useState(false)
  const [smsPhone, setSmsPhone] = useState("")
  const [smsMessage, setSmsMessage] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mobile/admin/dashboard")
      if (res.status === 401 || res.status === 403) return
      if (!res.ok) return
      const json = await res.json()
      setData(json)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [load])

  const confirmOrder = async (orderId: string) => {
    setActionLoading(`confirm-${orderId}`)
    try {
      const res = await fetch("/api/mobile/admin/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_order", orderId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      toast({ title: " Order confirmed", description: json.message })
      load()
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const shipOrder = async () => {
    if (!shipOrderId) return
    setActionLoading(`ship-${shipOrderId}`)
    try {
      const res = await fetch("/api/mobile/admin/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ship_order",
          orderId: shipOrderId,
          riderName,
          riderPhone,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      toast({ title: " Order shipped", description: json.message })
      setShipOrderId(null)
      setRiderName("")
      setRiderPhone("")
      load()
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const sendSms = async () => {
    setActionLoading("sms")
    try {
      const res = await fetch("/api/mobile/admin/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_sms",
          phone: smsPhone,
          message: smsMessage,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      toast({ title: "SMS sent", description: json.message })
      setSmsOpen(false)
      setSmsPhone("")
      setSmsMessage("")
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <p className="text-sm text-muted-foreground">Failed to load dashboard.</p>
        <Button variant="outline" className="mt-3" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <IconButton label={t('accessibility.go_back')} icon={<ArrowLeft className="h-4 w-4" />} onClick={goHome} variant="ghost" className="rounded-lg" />
            <div>
              <h1 className="text-base font-bold">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground">Mobile mini-panel · auto-refresh 10s</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="rounded-xl border bg-card p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-emerald-500" />
          <p className="mt-1 text-sm font-bold">{formatRWFCompact(data.summary.todayRevenue)}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Revenue</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <Package className="mx-auto h-4 w-4 text-sky-500" />
          <p className="mt-1 text-sm font-bold">{data.summary.todayOrderCount}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Orders</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <Users className="mx-auto h-4 w-4 text-violet-500" />
          <p className="mt-1 text-sm font-bold">{data.summary.activeVisitors}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Live</p>
        </div>
      </div>

      {/* Pending orders */}
      <div className="px-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-amber-500" />
          Pending Orders ({data.pendingOrders.length})
        </h2>
        {data.pendingOrders.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
             No pending orders. All caught up!
          </p>
        ) : (
          <div className="space-y-2">
            {data.pendingOrders.map((o) => (
              <div key={o.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold">{o.orderNumber}</p>
                    <p className="truncate text-sm font-medium">{o.customerName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{o.items}</p>
                  </div>
                  <p className="ml-2 shrink-0 text-sm font-bold">{formatRWF(o.total)}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 flex-1 text-xs"
                    onClick={() => confirmOrder(o.id)}
                    disabled={actionLoading === `confirm-${o.id}`}
                  >
                    {actionLoading === `confirm-${o.id}` ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    )}
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 text-xs"
                    onClick={() => setShipOrderId(o.id)}
                  >
                    <Truck className="mr-1 h-3 w-3" />
                    Ship
                  </Button>
                  <a href={`tel:${o.customerPhone}`}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Phone className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low stock alerts */}
      {data.lowStock.length > 0 && (
        <div className="mt-4 px-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low Stock ({data.lowStock.length})
          </h2>
          <div className="space-y-1">
            {data.lowStock.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
                {p.image && (
                  <img src={p.image} alt={p.name} className="h-8 w-8 rounded object-cover" />
                )}
                <p className="flex-1 truncate text-xs font-medium">{p.name}</p>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick SMS */}
      <div className="mt-4 px-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setSmsOpen(!smsOpen)}
        >
          <Send className="mr-2 h-4 w-4" />
          Quick SMS
        </Button>
        {smsOpen && (
          <div className="mt-2 space-y-2 rounded-xl border p-3">
            <Input
              placeholder="Phone (+2507XXXXXXXX)"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              className="h-9"
            />
            <Input
              placeholder="Message"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              className="h-9"
            />
            <Button
              className="w-full"
              size="sm"
              onClick={sendSms}
              disabled={!smsPhone || !smsMessage || actionLoading === "sms"}
            >
              {actionLoading === "sms" ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-2 h-3.5 w-3.5" />
              )}
              Send SMS
            </Button>
          </div>
        )}
      </div>

      {/* Ship modal */}
      {shipOrderId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setShipOrderId(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold">
              <Truck className="h-4 w-4 text-primary" />
              Ship Order
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rider name</label>
                <Input
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="e.g. Eric M."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rider phone</label>
                <Input
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="0788123456"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShipOrderId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={shipOrder}
                disabled={!riderName || !riderPhone || actionLoading?.startsWith("ship")}
              >
                {actionLoading?.startsWith("ship") ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="mr-2 h-4 w-4" />
                )}
                Ship Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
