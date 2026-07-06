"use client"

/**
 * AdminView — full admin dashboard with 7 tabs.
 *
 * Tabs:
 *   1. Overview    — revenue, charts, recent orders, top products
 *   2. Orders      — order management (existing, enhanced)
 *   3. Products    — product CRUD (existing AdminProductManager)
 *   4. Customers   — customer list, analytics, block/unblock
 *   5. Deliveries  — assign riders, track, performance
 *   6. Analytics   — charts, date range, export to CSV
 *   7. Settings    — coupons, banners, delivery fees
 *
 * Features:
 *   - Real-time new order notifications (sound + toast)
 *   - Notification bell with unread count
 *   - Responsive tab layout
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/store/useStore"
import { useAdminNotifications } from "@/hooks/useAdminNotifications"
import { AdminOverview } from "./AdminOverview"
import { AdminProductManager } from "./AdminProductManager"
import { AdminCustomers } from "./AdminCustomers"
import { AdminDeliveries } from "./AdminDeliveries"
import { AdminAnalytics } from "./AdminAnalytics"
import { AdminSettings } from "./AdminSettings"
import {
  Shield,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings as SettingsIcon,
  LayoutDashboard,
  Bell,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  ShoppingCart,
  Clock,
  TrendingUp,
} from "lucide-react"

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

export function AdminView() {
  const { goHome, user } = useStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")

  // Real-time notifications
  const { notifications, enabled, setEnabled, dismiss, clearAll } = useAdminNotifications()

  // ─── Orders state ─────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // ─── Bulk update state ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>("")

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
    if (activeTab === "orders") loadOrders()
  }, [loadOrders, activeTab])

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
      toast({ title: "Order updated", description: `${updated.orderNumber} → ${value}` })
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  // ─── Bulk status update ───────────────────────────────────────────
  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0 || !bulkStatus) return
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: bulkStatus }),
        })
      )
      await Promise.all(promises)
      toast({
        title: "Bulk update complete",
        description: `${selectedIds.size} orders → ${bulkStatus}`,
      })
      setSelectedIds(new Set())
      setBulkStatus("")
      loadOrders()
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" })
    }
  }

  // ─── Print invoice ────────────────────────────────────────────────
  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open("", "_blank", "width=600,height=800")
    if (!printWindow) return

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">RWF ${item.price.toLocaleString()}</td>
          <td style="text-align:right">RWF ${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
      `
      )
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice — ${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { color: #b76e79; margin-bottom: 0; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .header div p { margin: 2px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 14px; }
          th { background: #fce4ec; text-align: left; }
          .totals { margin-left: auto; width: 300px; }
          .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
          .totals .total { font-weight: bold; font-size: 18px; border-top: 2px solid #b76e79; padding-top: 10px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Ubumwe Beauty</h1>
            <p>Beauty that unites us</p>
            <p>KN 4 Ave, Kigali Heights, Kigali, Rwanda</p>
            <p>+250 788 123 456 · hello@ubumwe.beauty</p>
          </div>
          <div style="text-align: right">
            <h2>Invoice</h2>
            <p><strong>Order:</strong> ${order.orderNumber}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString("en-RW")}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
        </div>
        <div>
          <h3>Bill To:</h3>
          <p>${order.customerName}</p>
          <p>${order.customerPhone}</p>
          ${order.customerEmail ? `<p>${order.customerEmail}</p>` : ""}
          <p>${order.address}</p>
          <p>${order.city}, ${order.province}</p>
        </div>
        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal:</span><span>RWF ${order.subtotal.toLocaleString()}</span></div>
          ${order.discountAmount > 0 ? `<div><span>Discount:</span><span>-RWF ${order.discountAmount.toLocaleString()}</span></div>` : ""}
          <div><span>Delivery:</span><span>RWF ${order.deliveryFee.toLocaleString()}</span></div>
          <div class="total"><span>Total:</span><span>RWF ${order.total.toLocaleString()}</span></div>
        </div>
        <div class="footer">
          <p>Thank you for shopping with Ubumwe Beauty!</p>
          <p>Pay with MTN MoMo, Airtel Money, Visa/Mastercard, or Cash on Delivery</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleReseed = async () => {
    if (!window.confirm("Reset catalog to demo data? Orders will be preserved.")) return
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      if (!res.ok) throw new Error("Seed failed")
      toast({ title: "Database re-seeded" })
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
          {/* Notifications bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className="text-xs text-primary hover:underline"
                  >
                    {enabled ? "Pause" : "Resume"}
                  </button>
                  {notifications.length > 0 && (
                    <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">
                      Clear
                    </button>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => dismiss(n.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleReseed}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={goHome}>
            Exit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4 sm:grid-cols-7">
          <TabsTrigger value="overview" className="gap-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1">
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-1">
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>

        {/* Orders */}
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

          {/* Filters + bulk update */}
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

          {/* Bulk update bar */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-primary/10 p-3">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue placeholder="Set status..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(STATUS_NEXT).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkUpdate} disabled={!bulkStatus}>
                Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === orders.length && orders.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(orders.map((o) => o.id)))
                            } else {
                              setSelectedIds(new Set())
                            }
                          }}
                          className="h-4 w-4 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Order #</th>
                      <th className="px-4 py-3 text-left font-medium">Customer</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 text-left font-medium">Payment</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        className="hover:bg-secondary/20"
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(o.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds)
                              if (e.target.checked) next.add(o.id)
                              else next.delete(o.id)
                              setSelectedIds(next)
                            }}
                            className="h-4 w-4 rounded"
                          />
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3 font-mono text-xs font-medium"
                          onClick={() => handleRowClick(o)}
                        >
                          {o.orderNumber}
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3"
                          onClick={() => handleRowClick(o)}
                        >
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
                        <td
                          className="cursor-pointer px-4 py-3 text-right font-medium"
                          onClick={() => handleRowClick(o)}
                        >
                          {formatRWF(o.total)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {PAYMENT_METHODS[o.paymentMethod as PaymentMethodKey]?.label || o.paymentMethod}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || ""}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => handlePrintInvoice(o)}
                            >
                              Print
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Products */}
        <TabsContent value="products">
          <AdminProductManager />
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <AdminCustomers />
        </TabsContent>

        {/* Deliveries */}
        <TabsContent value="deliveries">
          <AdminDeliveries />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <AdminSettings />
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
                    {selectedOrder.address}
                    <br />
                    {selectedOrder.city}
                    {selectedOrder.district ? `, ${selectedOrder.district}` : ""}
                    <br />
                    {selectedOrder.province}
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

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handlePrintInvoice(selectedOrder)}
                >
                  Print invoice
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
