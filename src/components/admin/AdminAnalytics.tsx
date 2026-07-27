"use client"

/**
 * AdminAnalytics — comprehensive analytics dashboard with charts.
 *
 * Features:
 *   - Revenue summary cards (today, week, month, year)
 *   - Revenue over time line chart (Recharts)
 *   - Payment method breakdown pie chart
 *   - Orders by district bar chart
 *   - Sales by category bar chart
 *   - Order status breakdown
 *   - Top selling products
 *   - Low stock alerts
 *   - Recent orders table
 *   - Date range selector
 */

import { useEffect, useState, useCallback } from "react"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useStore } from "@/store/useStore"
import WhatsAppAnalytics from '@/components/admin/WhatsAppAnalytics'

// Removed unused imports: TrendingDown, ArrowRight, Clock, Legend, toast

interface AnalyticsData {
  revenue: {
    today: number
    todayCount: number
    week: number
    weekCount: number
    month: number
    monthCount: number
    year: number
    yearCount: number
    range: number
    rangeCount: number
  }
  revenueOverTime: { date: string; revenue: number; orders: number }[]
  statusBreakdown: { status: string; count: number }[]
  paymentBreakdown: { method: string; count: number; amount: number }[]
  topProducts: {
    id: string
    name: string
    price: number
    image: string | null
    totalSold: number
    orderCount: number
    revenue: number
  }[]
  ordersByDistrict: { district: string; orders: number; revenue: number }[]
  salesByCategory: { category: string; revenue: number; quantity: number }[]
  newCustomers: number
  lowStock: { id: string; name: string; stock: number; image: string | null }[]
  recentOrders: {
    id: string
    orderNumber: string
    customerName: string
    total: number
    status: string
    createdAt: string
    itemCount: number
    paymentMethod: string
    paymentStatus: string
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-orange-100 text-orange-700",
}

const PAYMENT_COLORS: Record<string, string> = {
  MTN_MOMO: "#FFCC00",
  AIRTEL_MONEY: "#E40000",
  CARD: "#1a1a1a",
  COD: "#10B981",
  BANK_TRANSFER: "#3B82F6",
}

export function AdminAnalytics() {
  const { goTrackOrder } = useStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState("month")

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`)
      if (res.status === 401 || res.status === 403) return
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">Failed to load analytics.</p>
        <Button variant="outline" className="mt-3" onClick={loadAnalytics}>
          Retry
        </Button>
      </div>
    )
  }

  const revenueCards = [
    {
      label: "Today",
      value: data.revenue.today,
      count: data.revenue.todayCount,
      icon: DollarSign,
    },
    {
      label: "This week",
      value: data.revenue.week,
      count: data.revenue.weekCount,
      icon: TrendingUp,
    },
    {
      label: "This month",
      value: data.revenue.month,
      count: data.revenue.monthCount,
      icon: TrendingUp,
    },
    {
      label: "This year",
      value: data.revenue.year,
      count: data.revenue.yearCount,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Analytics overview</h2>
          <p className="text-sm text-muted-foreground">
            Track your store performance in real-time.
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="year">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <WhatsAppAnalytics />

      {/* Revenue cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {revenueCards.map((card, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-xl font-bold">{formatRWF(card.value)}</p>
            <p className="text-xs text-muted-foreground">
              {card.count} order{card.count !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              New customers
            </p>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.newCustomers}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total orders
            </p>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.revenue.rangeCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Avg. order value
            </p>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">
            {data.revenue.rangeCount > 0
              ? formatRWF(Math.round(data.revenue.range / data.revenue.rangeCount))
              : "RWF 0"}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Low stock
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{data.lowStock.length}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-semibold">Revenue over time</h3>
        <p className="text-sm text-muted-foreground">Daily revenue for the selected period</p>
        <ResponsiveContainer width="100%" height={300} className="mt-4">
          <AreaChart data={data.revenueOverTime}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#b76e79" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#b76e79" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [formatRWF(Number(value)), "Revenue"]}
              labelStyle={{ fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#b76e79"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payment method breakdown */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-lg font-semibold">Payment methods</h3>
          <p className="text-sm text-muted-foreground">Revenue by payment type</p>
          {data.paymentBreakdown.length === 0 ? (
            <div className="grid h-64 place-items-center text-sm text-muted-foreground">
              No paid payments yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.paymentBreakdown}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ method, percent }: { method?: string; percent?: number }) =>
                    `${(method || "").replace("_", " ")} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.paymentBreakdown.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PAYMENT_COLORS[entry.method] || "#999"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatRWF(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order status breakdown */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-lg font-semibold">Order status</h3>
          <p className="text-sm text-muted-foreground">Current order distribution</p>
          <div className="mt-4 space-y-2">
            {data.statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[s.status] || "bg-secondary"
                  }`}
                >
                  {s.status}
                </span>
                <span className="text-sm font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders by district */}
      {data.ordersByDistrict.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-lg font-semibold">Orders by district</h3>
          <p className="text-sm text-muted-foreground">
            Top districts by order volume
          </p>
          <ResponsiveContainer width="100%" height={300} className="mt-4">
            <BarChart data={data.ordersByDistrict.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="district" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#b76e79" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sales by category */}
      {data.salesByCategory.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-lg font-semibold">Sales by category</h3>
          <p className="text-sm text-muted-foreground">Revenue and quantity per category</p>
          <ResponsiveContainer width="100%" height={300} className="mt-4">
            <BarChart data={data.salesByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={100} />
              <Tooltip formatter={(value) => formatRWF(Number(value))} />
              <Bar dataKey="revenue" fill="#b76e79" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Low stock alerts + Top products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Low stock */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Low stock alerts
          </h3>
          {data.lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              All products are well-stocked.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border p-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                    {p.image && (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                  </div>
                  <Badge
                    variant={p.stock === 0 ? "destructive" : "secondary"}
                    className="shrink-0"
                  >
                    {p.stock} left
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top products */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" /> Top selling products
          </h3>
          {data.topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {data.topProducts.slice(0, 5).map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                    {p.image && (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.totalSold} sold · {formatRWF(p.revenue)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-semibold">Recent orders</h3>
        {data.recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 text-left font-medium">Order</th>
                  <th className="py-2 pr-3 text-left font-medium">Customer</th>
                  <th className="py-2 pr-3 text-right font-medium">Total</th>
                  <th className="py-2 pr-3 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer hover:bg-secondary/20"
                    onClick={() => goTrackOrder(o.orderNumber)}
                  >
                    <td className="py-2 pr-3 font-mono text-xs font-medium">
                      {o.orderNumber}
                    </td>
                    <td className="py-2 pr-3">
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground">{o.itemCount} items</p>
                    </td>
                    <td className="py-2 pr-3 text-right font-medium">
                      {formatRWF(o.total)}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[o.status] || ""
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString("en-RW", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
