"use client"

/**
 * AdminOverview — dashboard overview with charts + stats.
 *
 * Features:
 *   - Revenue cards (today, week, month, year) in RWF
 *   - Revenue chart (line graph, last 30 days)
 *   - Orders by status
 *   - New customers
 *   - Low stock alerts
 *   - Recent orders table
 *   - Top selling products
 *   - Orders by district
 *   - Payment method breakdown (pie chart)
 *   - Sales by category (bar chart)
 */

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { formatRWF } from "@/lib/format"
import { useStore } from "@/store/useStore"
import {
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
} from "lucide-react"

interface AnalyticsData {
  range: string
  revenue: { today: number; week: number; month: number; year: number }
  ordersByStatus: Record<string, number>
  totalOrders: number
  newCustomers: number
  lowStockProducts: Array<{
    id: string
    name: string
    stock: number
    image: string | null
    price: number
  }>
  outOfStockCount: number
  recentOrders: Array<{
    id: string
    orderNumber: string
    customerName: string
    customerPhone: string
    total: number
    status: string
    paymentMethod: string
    paymentStatus: string
    itemCount: number
    createdAt: string
  }>
  revenueChart: Array<{ date: string; revenue: number; orders: number }>
  topProducts: Array<{
    id: string
    name: string
    price: number
    image: string | null
    totalSold: number
    revenue: number
  }>
  ordersByDistrict: Array<{ district: string; orders: number; revenue: number }>
  paymentBreakdown: Array<{ method: string; count: number; amount: number }>
  salesByCategory: Array<{ category: string; revenue: number; quantity: number }>
}

const PAYMENT_COLORS: Record<string, string> = {
  MTN_MOMO: "#FFCC00",
  AIRTEL_MONEY: "#E40000",
  CARD: "#1a1a1a",
  COD: "#10B981",
  BANK_TRANSFER: "#3B82F6",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export function AdminOverview() {
  const { goTrackOrder } = useStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/analytics?range=month")
      if (!res.ok) return
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Revenue cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <RevenueCard
          label="Today"
          value={data.revenue.today}
          icon={DollarSign}
          color="text-emerald-600"
        />
        <RevenueCard
          label="This Week"
          value={data.revenue.week}
          icon={TrendingUp}
          color="text-primary"
        />
        <RevenueCard
          label="This Month"
          value={data.revenue.month}
          icon={TrendingUp}
          color="text-blue-600"
        />
        <RevenueCard
          label="This Year"
          value={data.revenue.year}
          icon={TrendingUp}
          color="text-purple-600"
        />
      </div>

      {/* ─── Quick stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={data.totalOrders}
          sub={`${data.ordersByStatus.PENDING || 0} pending`}
          icon={ShoppingCart}
        />
        <StatCard
          label="New Customers"
          value={data.newCustomers}
          sub="this month"
          icon={Users}
        />
        <StatCard
          label="Low Stock"
          value={data.lowStockProducts.length}
          sub={`${data.outOfStockCount} out of stock`}
          icon={AlertTriangle}
          color={data.lowStockProducts.length > 0 ? "text-amber-600" : "text-emerald-600"}
        />
        <StatCard
          label="Delivered"
          value={data.ordersByStatus.DELIVERED || 0}
          sub="this month"
          icon={Package}
          color="text-emerald-600"
        />
      </div>

      {/* ─── Revenue chart ──────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-primary" /> Revenue (last 30 days)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.revenueChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => {
                const date = new Date(d)
                return `${date.getDate()}/${date.getMonth() + 1}`
              }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [formatRWF(Number(value)), "Revenue"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString("en-RW")}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Charts row: Payment breakdown + Sales by category ─────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment method breakdown */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 text-lg font-semibold">Payment methods</h3>
          {data.paymentBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No payments yet this month
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.paymentBreakdown.map((p) => ({
                    name: p.method.replace("_", " "),
                    value: p.amount,
                    count: p.count,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name}`}
                >
                  {data.paymentBreakdown.map((entry) => (
                    <Cell
                      key={entry.method}
                      fill={PAYMENT_COLORS[entry.method] || "#999"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatRWF(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales by category */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 text-lg font-semibold">Sales by category</h3>
          {data.salesByCategory.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No sales yet this month
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.salesByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(value) => formatRWF(Number(value))} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Recent orders + Top products ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 text-lg font-semibold">Recent orders</h3>
          {data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.slice(0, 6).map((order) => (
                <button
                  key={order.id}
                  onClick={() => goTrackOrder(order.orderNumber)}
                  className="flex w-full items-center justify-between rounded-lg border p-2 text-left hover:bg-secondary/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium">{order.orderNumber}</p>
                    <p className="truncate text-sm font-medium">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.itemCount} items · {new Date(order.createdAt).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">{formatRWF(order.total)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        STATUS_COLORS[order.status] || ""
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5 text-amber-400" /> Top selling products
          </h3>
          {data.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales yet</p>
          ) : (
            <div className="space-y-2">
              {data.topProducts.slice(0, 6).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                    {p.image && (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.totalSold} sold · {formatRWF(p.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Orders by district ─────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-4 text-lg font-semibold">Orders by district</h3>
        {data.ordersByDistrict.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ordersByDistrict.slice(0, 15)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="district"
                tick={{ fontSize: 11 }}
                width={100}
              />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── Low stock alerts ───────────────────────────────────────── */}
      {data.lowStockProducts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-900">Low stock alerts</h3>
          </div>
          <div className="space-y-2">
            {data.lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-background p-2"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                  {p.image && <img src={p.image} alt={p.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatRWF(p.price)}</p>
                </div>
                <Badge
                  className={p.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}
                >
                  {p.stock} left
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RevenueCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-2 text-xl font-bold sm:text-2xl">{formatRWF(value)}</p>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-primary",
}: {
  label: string
  value: number
  sub: string
  icon: React.ElementType
  color?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
