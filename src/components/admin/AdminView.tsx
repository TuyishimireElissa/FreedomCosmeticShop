"use client"

/**
 * Admin dashboard — tabbed interface.
 *
 * Tabs:
 *   1. Orders — order management (existing functionality)
 *   2. Products — product CRUD (AdminProductManager)
 *   3. Analytics — stats dashboard (top products, revenue, low stock alerts)
 */

import { useEffect, useState, useCallback } from "react"
import { Order } from "@/lib/types"
import { formatRWF, PAYMENT_METHODS, PaymentMethodKey } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/store/useStore"
import { AdminProductManager } from "./AdminProductManager"
import {
  Search,
  RefreshCw,
  Shield,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
  Users,
  DollarSign,
  Box,
  Star,
} from "lucide-react"

// ... (order management code from existing AdminView, kept below)

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const

const STATUS_NEXT: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
}

interface AdminStats {
  products: { total: number; active: number; lowStock: number; outOfStock: number }
  orders: { total: number; pending: number; delivered: number; revenue: number }
  customers: { total: number }
  topProducts: Array<{
    id: string
    name: string
    slug: string
    price: number
    image: string | null
    totalSold: number
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    customerName: string
    total: number
    status: string
    createdAt: string
    itemCount: number
  }>
}

export function AdminView() {
  const { goHome, user } = useStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("orders")

  // ─── Orders state ─────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // ─── Analytics state ──────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/orders?${params.toString()}`)
      const data = await res.json()
      let list: Order[] = data.orders || []
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        list = list.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.toLowerCase().includes(q)
        )
      }
      setOrders(list)
    } catch (e) {
      console.error("Failed to load orders:", e)
    } finally {
      setOrdersLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const id = setInterval(loadOrders, 30000)
    return () => clearInterval(id)
  }, [loadOrders])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/admin/stats")
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "analytics") loadStats()
  }, [activeTab, loadStats])

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  const updateOrderStatus = async (
    orderId: string,
    field: "status" | "paymentStatus",
    value: string
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error("Update failed")
      const data = await res.json()
      const updated = data.order as Order
      setSelectedOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      toast({
        title: "Order updated",
        description: `${updated.orderNumber} → ${value}`,
      })
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleReseed = async () => {
    if (!window.confirm("Reset catalog to demo data? Orders will be preserved.")) return
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      if (!res.ok) throw new Error("Seed failed")
      toast({ title: "Database re-seeded" })
      loadStats()
    } catch (e) {
      toast({
        title: "Seed failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    revenue: orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.total, 0),
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Admin dashboard
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.name ? `Welcome, ${user.name}` : "Manage your store"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReseed}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Reset demo
          </Button>
          <Button variant="ghost" size="sm" onClick={goHome}>
            Exit admin
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ─── Orders tab ─────────────────────────────────────────── */}
        <TabsContent value="orders">
          {/* Quick stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total orders", value: orderStats.total, icon: Package },
              { label: "Pending", value: orderStats.pending, icon: Clock },
              { label: "Delivered", value: orderStats.delivered, icon: CheckCircle2 },
              { label: "Revenue", value: formatRWF(orderStats.revenue), icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <form className="relative min-w-[200px] flex-1" onSubmit={(e) => e.preventDefault()}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order #, name, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
              />
            </form>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadOrders} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Orders table */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            {ordersLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="grid place-items-center py-16 text-center">
                <Package className="h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-3 font-semibold">No orders found</h3>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Order #</th>
                        <th className="px-4 py-3 text-left font-medium">Customer</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                        <th className="px-4 py-3 text-left font-medium">Payment</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orders.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => handleRowClick(o)}
                          className="cursor-pointer hover:bg-secondary/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-medium">{o.orderNumber}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{o.customerName}</p>
                            <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString("en-RW", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatRWF(o.total)}</td>
                          <td className="px-4 py-3 text-xs">
                            {PAYMENT_METHODS[o.paymentMethod as PaymentMethodKey]?.label || o.paymentMethod}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || ""}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y md:hidden">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleRowClick(o)}
                      className="block w-full p-4 text-left hover:bg-secondary/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium">{o.orderNumber}</span>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || ""}`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="mt-1 font-medium">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                      <p className="mt-1 text-sm font-semibold">{formatRWF(o.total)}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ─── Products tab ───────────────────────────────────────── */}
        <TabsContent value="products">
          <AdminProductManager onStatsUpdate={loadStats} />
        </TabsContent>

        {/* ─── Analytics tab ──────────────────────────────────────── */}
        <TabsContent value="analytics">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Products", value: stats.products.total, icon: Box, sub: `${stats.products.active} active` },
                  { label: "Orders", value: stats.orders.total, icon: Package, sub: `${stats.orders.pending} pending` },
                  { label: "Revenue", value: formatRWF(stats.orders.revenue), icon: DollarSign, sub: `${stats.orders.delivered} delivered` },
                  { label: "Customers", value: stats.customers.total, icon: Users, sub: "registered" },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </p>
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Low stock alert */}
              {stats.products.lowStock > 0 || stats.products.outOfStock > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-900">Stock alerts</h3>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-amber-800">
                    {stats.products.lowStock > 0 && (
                      <p>• {stats.products.lowStock} products with low stock (≤5 units)</p>
                    )}
                    {stats.products.outOfStock > 0 && (
                      <p>• {stats.products.outOfStock} products out of stock</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setActiveTab("products")}
                  >
                    Manage products
                  </Button>
                </div>
              ) : null}

              {/* Top products */}
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Star className="h-5 w-5 text-amber-400" /> Top selling products
                </h3>
                <div className="mt-4 space-y-3">
                  {stats.topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sales yet. Top products will appear here.
                    </p>
                  ) : (
                    stats.topProducts.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-xs font-bold">
                          {i + 1}
                        </span>
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                          {p.image && (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRWF(p.price)} each
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{p.totalSold} sold</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRWF(p.price * p.totalSold)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent orders */}
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="text-lg font-semibold">Recent orders</h3>
                <div className="mt-4 space-y-2">
                  {stats.recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders yet.</p>
                  ) : (
                    stats.recentOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between border-b py-2 last:border-b-0"
                      >
                        <div>
                          <p className="font-mono text-xs font-medium">{o.orderNumber}</p>
                          <p className="text-sm">{o.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatRWF(o.total)}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.status} · {o.itemCount} items
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">Failed to load analytics.</p>
              <Button variant="outline" className="mt-3" onClick={loadStats}>
                Retry
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order detail drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Order {selectedOrder.orderNumber}</SheetTitle>
                <SheetDescription>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString("en-RW")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</h3>
                  <p className="mt-1 font-medium">{selectedOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery address</h3>
                  <p className="mt-1 text-sm">
                    {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.province}
                  </p>
                  {selectedOrder.notes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{selectedOrder.notes}&rdquo;</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Items ({selectedOrder.items.length})
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id} className="flex gap-2 text-sm">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                          {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium leading-snug">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRWF(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{formatRWF(item.price * item.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 rounded-lg bg-secondary/30 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatRWF(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{formatRWF(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>{formatRWF(selectedOrder.total)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Order status
                    </label>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(v) => updateOrderStatus(selectedOrder.id, "status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(STATUS_NEXT).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {STATUS_NEXT[selectedOrder.status]?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {STATUS_NEXT[selectedOrder.status].map((next) => (
                          <Button
                            key={next}
                            size="sm"
                            variant={next === "CANCELLED" ? "destructive" : "default"}
                            onClick={() => updateOrderStatus(selectedOrder.id, "status", next)}
                          >
                            {next === "CANCELLED" ? (
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Mark as {next.toLowerCase()}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment status
                    </label>
                    <Select
                      value={selectedOrder.paymentStatus}
                      onValueChange={(v) => updateOrderStatus(selectedOrder.id, "paymentStatus", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
