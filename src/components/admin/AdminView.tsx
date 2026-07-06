"use client"

/**
 * Admin dashboard — basic order management.
 *
 * Features:
 *  - Order list table: order number, customer, total, payment, status, date
 *  - Filter by status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
 *  - Search by order number or customer name/phone
 *  - Click a row to open an order detail drawer
 *  - Update order status (dropdown) and payment status
 *  - Auto-refresh orders every 30s
 *  - Re-seed button (demo convenience)
 *
 * Note: For the MVP, this admin view is not authenticated. In production,
 * protect it with NextAuth.js + an Admin role check.
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
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/store/useStore"
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
  const { goHome } = useStore()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadOrders = useCallback(async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/orders?${params.toString()}`)
      const data = await res.json()
      let list: Order[] = data.orders || []
      // Client-side search filter (server doesn't support it yet)
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
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(loadOrders, 30000)
    return () => clearInterval(id)
  }, [loadOrders])

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
        description: `${updated.orderNumber} → ${field === "status" ? "Status" : "Payment"}: ${value}`,
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
    if (
      !window.confirm(
        "This will reset the product catalog to demo data. Orders will be preserved. Continue?"
      )
    ) {
      return
    }
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      if (!res.ok) throw new Error("Seed failed")
      toast({
        title: "Database re-seeded",
        description: "Product catalog reset to demo state.",
      })
    } catch (e) {
      toast({
        title: "Seed failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  // Compute quick stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    revenue: orders.filter((o) => o.status === "DELIVERED").reduce((sum, o) => sum + o.total, 0),
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-primary h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">View and manage customer orders.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleReseed}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Reset demo
          </Button>
          <Button variant="ghost" size="sm" onClick={goHome}>
            Exit admin
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total orders", value: stats.total, icon: Package, color: "text-primary" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600" },
          {
            label: "Delivered",
            value: stats.delivered,
            icon: CheckCircle2,
            color: "text-emerald-600",
          },
          {
            label: "Revenue (delivered)",
            value: formatRWF(stats.revenue),
            icon: TrendingUp,
            color: "text-primary",
          },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {s.label}
              </p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="mt-2 text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative min-w-[200px] flex-1" onSubmit={(e) => e.preventDefault()}>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by order #, name, or phone..."
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
      </div>

      {/* Orders table */}
      <div className="bg-card overflow-hidden rounded-2xl border">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Package className="text-muted-foreground/40 h-10 w-10" />
            <h3 className="mt-3 font-semibold">No orders found</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {statusFilter !== "all"
                ? `No ${statusFilter.toLowerCase()} orders.`
                : "Orders will appear here once customers check out."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 text-muted-foreground border-b text-xs tracking-wider uppercase">
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
                      className="hover:bg-secondary/30 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.customerName}</p>
                        <p className="text-muted-foreground text-xs">{o.customerPhone}</p>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {new Date(o.createdAt).toLocaleDateString("en-RW", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatRWF(o.total)}</td>
                      <td className="px-4 py-3 text-xs">
                        {PAYMENT_METHODS[o.paymentMethod as PaymentMethodKey]?.label ||
                          o.paymentMethod}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || ""}`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y md:hidden">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleRowClick(o)}
                  className="hover:bg-secondary/30 block w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium">{o.orderNumber}</span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || ""}`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{o.customerName}</p>
                  <p className="text-muted-foreground text-xs">{o.customerPhone}</p>
                  <p className="mt-1 text-sm font-semibold">{formatRWF(o.total)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

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
                {/* Customer */}
                <div>
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Customer
                  </h3>
                  <p className="mt-1 font-medium">{selectedOrder.customerName}</p>
                  <p className="text-muted-foreground text-sm">{selectedOrder.customerPhone}</p>
                  {selectedOrder.customerEmail && (
                    <p className="text-muted-foreground text-sm">{selectedOrder.customerEmail}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Delivery address
                  </h3>
                  <p className="mt-1 text-sm">
                    {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.province}
                  </p>
                  {selectedOrder.notes && (
                    <p className="text-muted-foreground mt-1 text-xs italic">
                      &ldquo;{selectedOrder.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Items ({selectedOrder.items.length})
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id} className="flex gap-2 text-sm">
                        <div className="bg-secondary/30 h-10 w-10 shrink-0 overflow-hidden rounded">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs leading-snug font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatRWF(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatRWF(item.price * item.quantity)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Totals */}
                <div className="bg-secondary/30 space-y-2 rounded-lg p-3 text-sm">
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

                {/* Status controls */}
                <div className="space-y-3">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wider uppercase">
                      Order status
                    </label>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(v) => updateOrderStatus(selectedOrder.id, "status", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(STATUS_NEXT).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
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
                    <label className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wider uppercase">
                      Payment status
                    </label>
                    <Select
                      value={selectedOrder.paymentStatus}
                      onValueChange={(v) => updateOrderStatus(selectedOrder.id, "paymentStatus", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-secondary/30 rounded-lg p-3 text-xs">
                    <p className="text-muted-foreground">Payment method</p>
                    <p className="mt-0.5 font-medium">
                      {PAYMENT_METHODS[selectedOrder.paymentMethod as PaymentMethodKey]?.label ||
                        selectedOrder.paymentMethod}
                    </p>
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
