"use client"

/**
 * WholesaleDashboard — dashboard for approved wholesale customers.
 *
 * Section 6: Wholesale Shopping Experience
 *
 * Shows:
 *   - Credit balance + usage bar
 *   - Total saved + this month saved
 *   - Recent wholesale orders
 *   - Recent invoices
 *   - Quick actions (New Order, My Invoices, Track Orders)
 *   - Account manager contact
 *
 * Accessible via wholesale view → "Dashboard" tab.
 */

import { useState, useEffect, useCallback } from "react"
import { useStore } from "@/store/useStore"
import { formatRWF, formatRWFCompact } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  TrendingDown,
  CreditCard,
  Package,
  FileText,
  Truck,
  Phone,
  MessageCircle,
  ShoppingBag,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DashboardData {
  credit: {
    limit: number
    used: number
    available: number
    paymentTermDays: number
  } | null
  totalSaved: number
  thisMonthSaved: number
  recentOrders: Array<{
    id: string
    orderNumber: string
    total: number
    status: string
    createdAt: string
    isCredit: boolean
  }>
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    totalAmount: number
    isPaid: boolean
    dueDate: string | null
    issuedAt: string
  }>
  user: {
    name: string
    businessName: string
    phone: string
  }
}

export function WholesaleDashboard({ onInvoices, onCatalog }: { onInvoices: () => void; onCatalog: () => void }) {
  const { toast } = useToast()
  const { goHome } = useStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wholesale/dashboard")
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
  }, [load])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-48 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">Failed to load dashboard.</p>
        <Button variant="outline" className="mt-3" onClick={load}>Retry</Button>
      </div>
    )
  }

  const creditPct = data.credit && data.credit.limit > 0
    ? Math.round((data.credit.used / data.credit.limit) * 100)
    : 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goHome} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              🏪 Wholesale Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">{data.user.businessName}</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <CreditCard className="h-4 w-4 text-violet-500" />
          <p className="mt-1 text-lg font-bold">{data.credit ? formatRWFCompact(data.credit.available) : "N/A"}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Credit Available</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <TrendingDown className="h-4 w-4 text-emerald-500" />
          <p className="mt-1 text-lg font-bold text-emerald-600">{formatRWFCompact(data.totalSaved)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Saved</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 col-span-2 sm:col-span-1">
          <Package className="h-4 w-4 text-sky-500" />
          <p className="mt-1 text-lg font-bold text-sky-600">{formatRWFCompact(data.thisMonthSaved)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved This Month</p>
        </div>
      </div>

      {/* Credit usage bar */}
      {data.credit && (
        <div className="mt-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Credit Usage</span>
            <span className="text-muted-foreground">
              Used: {formatRWF(data.credit.used)} / {formatRWF(data.credit.limit)}
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${creditPct > 80 ? "bg-red-500" : creditPct > 50 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${creditPct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{creditPct}% used</span>
            <span>Payment terms: {data.credit.paymentTermDays} days</span>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={onCatalog}>
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span className="text-xs">New Order</span>
        </Button>
        {/* Section 9B: Quick Reorder — adds last order items to cart */}
        {data.recentOrders.length > 0 && (
          <Button
            variant="outline"
            className="h-auto flex-col gap-1 py-3"
            onClick={async () => {
              const lastOrder = data.recentOrders[0]
              try {
                const res = await fetch(`/api/orders/${lastOrder.orderNumber}`)
                if (!res.ok) return
                const orderData = await res.json()
                const items = orderData.order?.items || []
                for (const item of items) {
                  useStore.getState().addToCart({
                    productId: item.productId || item.id,
                    slug: item.productId || item.id,
                    name: item.name,
                    price: item.price,
                    image: item.image || "",
                    stock: 999,
                  }, item.quantity)
                }
                toast({ title: "🛒 Items added to cart", description: `${items.length} items from ${lastOrder.orderNumber}` })
                onCatalog()
              } catch {
                toast({ title: "Reorder failed", variant: "destructive" })
              }
            }}
          >
            <RefreshCw className="h-5 w-5 text-violet-500" />
            <span className="text-xs">Quick Reorder</span>
          </Button>
        )}
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={onInvoices}>
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs">My Invoices</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={() => useStore.getState().setView("trackOrder")}>
          <Truck className="h-5 w-5 text-primary" />
          <span className="text-xs">Track Orders</span>
        </Button>
        <a href="https://wa.me/250780000000" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="h-auto w-full flex-col gap-1 py-3">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            <span className="text-xs">Support</span>
          </Button>
        </a>
      </div>

      {/* Recent orders */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Recent Wholesale Orders</h2>
        {data.recentOrders.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            No wholesale orders yet. <button onClick={onCatalog} className="text-primary hover:underline">Place your first order →</button>
          </p>
        ) : (
          <div className="space-y-2">
            {data.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm">
                <div>
                  <p className="font-mono text-xs font-bold">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}
                    {o.isCredit && <span className="ml-2 text-violet-600">· 💳 Credit</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatRWF(o.total)}</p>
                  <span className={`text-[10px] font-medium ${
                    o.status === "DELIVERED" ? "text-emerald-600" :
                    o.status === "CANCELLED" ? "text-red-600" :
                    "text-amber-600"
                  }`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Invoices</h2>
          <button onClick={onInvoices} className="text-xs text-primary hover:underline">View All →</button>
        </div>
        {data.recentInvoices.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            No invoices yet. Invoices are generated automatically when you place a wholesale order.
          </p>
        ) : (
          <div className="space-y-2">
            {data.recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm">
                <div>
                  <p className="font-mono text-xs font-bold">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.issuedAt).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}
                    {inv.dueDate && !inv.isPaid && (
                      <span className="ml-2 text-amber-600">· Due: {new Date(inv.dueDate).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatRWF(inv.totalAmount)}</p>
                  <span className={`text-[10px] font-medium ${inv.isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                    {inv.isPaid ? "✅ PAID" : "⏳ DUE"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account manager */}
      <div className="mt-6 rounded-2xl border bg-secondary/20 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Account Manager</h3>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Jean Paul — Wholesale Manager</p>
            <p className="text-xs text-muted-foreground">Mon-Fri, 8AM - 6PM CAT</p>
          </div>
          <div className="flex gap-2">
            <a href="tel:+250789000001">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <Phone className="h-3.5 w-3.5" />
              </Button>
            </a>
            <a href="https://wa.me/250789000001" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
