"use client"

/**
 * AdminReports — Section 10: Analytics & Reports (print-ready, deeper KPIs).
 *
 * This is an ADDITIVE companion to the existing AdminAnalytics tab.
 * AdminAnalytics shows the live operational dashboard (revenue / status / low-stock).
 * AdminReports focuses on:
 *   - Print-friendly report header with date range
 *   - KPI snapshot grid (revenue, AOV, orders, repeat rate, new customers, low stock)
 *   - Customer growth chart (daily new + cumulative)
 *   - Hourly orders distribution (24-point bar chart — when customers buy)
 *   - Conversion funnel visualization (Placed → Paid → Delivered)
 *   - AOV trend line chart
 *   - Top districts + top products tables
 *   - Export buttons: CSV summary, payments CSV, full CSV orders, print-to-PDF
 *
 * Fetches from /api/admin/analytics?range=<range> and /api/admin/export.
 */

import { useEffect, useState, useCallback, useMemo } from "react"
import { formatRWF, formatRWFCompact } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Clock,
  Repeat,
  Download,
  Printer,
  FileText,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Truck,
  ArrowDown,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts"

// ============================================================================
// Types
// ============================================================================

interface ReportData {
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
  newCustomers: number
  lowStock: { id: string; name: string; stock: number; image: string | null }[]
  // Section 10 additions
  customerGrowth: { date: string; newCustomers: number; cumulative: number }[]
  hourlyOrders: { hour: string; orders: number }[]
  conversionFunnel: { stage: string; count: number; color: string }[]
  repeatCustomerRate: number
  repeatCustomers: number
  uniqueCustomers: number
  aovTrend: { date: string; aov: number }[]
  rangeStart: string
  rangeEnd: string
}

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
] as const

// ============================================================================
// Component
// ============================================================================

export function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<string>("month")

  const load = useCallback(async () => {
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
    load()
  }, [load])

  // Export handlers
  const triggerDownload = (url: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = ""
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const exportAnalytics = () =>
    triggerDownload(`/api/admin/export?type=analytics&range=${range}`)
  const exportPayments = () =>
    triggerDownload("/api/admin/export?type=payments")
  const exportOrders = () =>
    triggerDownload("/api/admin/export?type=orders")
  const exportProducts = () =>
    triggerDownload("/api/admin/export?type=products")
  const exportCustomers = () =>
    triggerDownload("/api/admin/export?type=customers")

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print()
  }

  // Derived values
  const aov = useMemo(() => {
    if (!data || data.revenue.rangeCount === 0) return 0
    return Math.round(data.revenue.range / data.revenue.rangeCount)
  }, [data])

  const conversionRates = useMemo(() => {
    if (!data || data.conversionFunnel.length === 0) return []
    const placed = data.conversionFunnel[0]?.count || 0
    return data.conversionFunnel.map((f, i) => ({
      ...f,
      pctOfPlaced: placed > 0 ? Math.round((f.count / placed) * 100) : 0,
      pctFromPrev: i === 0
        ? 100
        : (data.conversionFunnel[i - 1].count > 0
            ? Math.round((f.count / data.conversionFunnel[i - 1].count) * 100)
            : 0),
    }))
  }, [data])

  const peakHour = useMemo(() => {
    if (!data || data.hourlyOrders.length === 0) return null
    return data.hourlyOrders.reduce((max, h) => (h.orders > max.orders ? h : max), data.hourlyOrders[0])
  }, [data])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">Failed to load report.</p>
        <Button variant="outline" className="mt-3" onClick={load}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* ─── Print header (hidden on screen) ─── */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">FreedomCosmeticShop — Performance Report</h1>
        <p className="text-sm">
          Range: {RANGE_OPTIONS.find((r) => r.value === range)?.label} ·{" "}
          {new Date(data.rangeStart).toLocaleDateString("en-RW")} →{" "}
          {new Date(data.rangeEnd).toLocaleDateString("en-RW")}
        </p>
        <p className="text-xs text-muted-foreground">
          Generated: {new Date().toLocaleString("en-RW")}
        </p>
        <hr className="my-3" />
      </div>

      {/* ─── Action header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <FileText className="h-5 w-5 text-primary" />
            Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            Print-ready performance report · {RANGE_OPTIONS.find((r) => r.value === range)?.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* ─── Export buttons row ─── */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={exportAnalytics}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Analytics summary CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportOrders}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Orders CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportPayments}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Payments CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportProducts}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Products CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportCustomers}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Customers CSV
        </Button>
      </div>

      {/* ─── KPI snapshot ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          label="Revenue"
          value={formatRWFCompact(data.revenue.range)}
          sub={`${data.revenue.rangeCount} orders`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label="Avg. order value"
          value={formatRWFCompact(aov)}
          sub="per order"
        />
        <KpiCard
          icon={<ShoppingCart className="h-4 w-4 text-sky-500" />}
          label="Orders"
          value={data.revenue.rangeCount.toString()}
          sub="non-cancelled"
        />
        <KpiCard
          icon={<Repeat className="h-4 w-4 text-violet-500" />}
          label="Repeat rate"
          value={`${data.repeatCustomerRate}%`}
          sub={`${data.repeatCustomers}/${data.uniqueCustomers} customers`}
        />
        <KpiCard
          icon={<Users className="h-4 w-4 text-amber-500" />}
          label="New customers"
          value={data.newCustomers.toString()}
          sub="joined in range"
        />
        <KpiCard
          icon={<Package className="h-4 w-4 text-rose-500" />}
          label="Low stock"
          value={data.lowStock.length.toString()}
          sub="needs restock"
        />
      </div>

      {/* ─── Customer growth ─── */}
      <ReportCard
        title="Customer growth"
        subtitle="Daily new customers (bars) + cumulative total (line)"
      >
        {data.customerGrowth.length === 0 ? (
          <EmptyChart message="No new customers in this range." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.customerGrowth}>
              <defs>
                <linearGradient id="newCustGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                yAxisId="left"
                dataKey="newCustomers"
                name="New"
                fill="url(#newCustGradient)"
                stroke="#f59e0b"
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="Cumulative"
                stroke="#b76e79"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ReportCard>

      {/* ─── Two-column: hourly orders + conversion funnel ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard
          title="Orders by hour of day"
          subtitle={
            peakHour && peakHour.orders > 0
              ? `Peak: ${peakHour.hour} (${peakHour.orders} orders)`
              : "24-hour distribution"
          }
        >
          {data.hourlyOrders.every((h) => h.orders === 0) ? (
            <EmptyChart message="No orders in this range." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.hourlyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9 }}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#b76e79" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ReportCard>

        <ReportCard
          title="Conversion funnel"
          subtitle="Placed → Paid → Delivered"
        >
          <div className="space-y-3 py-2">
            {conversionRates.map((stage, i) => {
              const widthPct = conversionRates[0].count > 0
                ? Math.max(2, (stage.count / conversionRates[0].count) * 100)
                : 0
              return (
                <div key={stage.stage}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      {i === 0 && <ShoppingCart className="h-3.5 w-3.5 text-slate-400" />}
                      {i === 1 && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                      {i === 2 && <Truck className="h-3.5 w-3.5 text-emerald-500" />}
                      {stage.stage}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{stage.count}</span>
                      {" · "}
                      {stage.pctOfPlaced}% of placed
                      {i > 0 && (
                        <span className="text-red-500">
                          {" "}(−{100 - stage.pctFromPrev}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-7 w-full overflow-hidden rounded-md bg-secondary">
                    <div
                      className="flex h-full items-center justify-end rounded-md px-2 text-[10px] font-medium text-white transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
                    >
                      {stage.count > 0 && stage.count}
                    </div>
                  </div>
                  {i < conversionRates.length - 1 && (
                    <div className="my-1 flex justify-center">
                      <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              )
            })}
            {conversionRates.length > 0 && conversionRates[0].count === 0 && (
              <EmptyChart message="No orders placed in this range." />
            )}
          </div>
        </ReportCard>
      </div>

      {/* ─── AOV trend ─── */}
      <ReportCard
        title="Average order value trend"
        subtitle="Daily AOV in RWF"
      >
        {data.aovTrend.length === 0 ? (
          <EmptyChart message="No orders in this range." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.aovTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v) => formatRWF(Number(v))} />
              <Line
                type="monotone"
                dataKey="aov"
                name="AOV"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ReportCard>

      {/* ─── Two-column: top districts + top products ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard title="Top districts" subtitle="By order volume">
          {data.ordersByDistrict.length === 0 ? (
            <EmptyChart message="No district data." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 text-left font-medium">#</th>
                    <th className="py-2 pr-3 text-left font-medium">District</th>
                    <th className="py-2 pr-3 text-right font-medium">Orders</th>
                    <th className="py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.ordersByDistrict.slice(0, 8).map((d, i) => (
                    <tr key={d.district}>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium">{d.district}</td>
                      <td className="py-2 pr-3 text-right">{d.orders}</td>
                      <td className="py-2 text-right font-medium">{formatRWF(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportCard>

        <ReportCard title="Top products" subtitle="By units sold">
          {data.topProducts.length === 0 ? (
            <EmptyChart message="No product sales." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 text-left font-medium">#</th>
                    <th className="py-2 pr-3 text-left font-medium">Product</th>
                    <th className="py-2 pr-3 text-right font-medium">Sold</th>
                    <th className="py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.topProducts.slice(0, 8).map((p, i) => (
                    <tr key={p.id}>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <p className="line-clamp-1 font-medium">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.orderCount} orders · {formatRWF(p.price)} each
                        </p>
                      </td>
                      <td className="py-2 pr-3 text-right">{p.totalSold}</td>
                      <td className="py-2 text-right font-medium">{formatRWF(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportCard>
      </div>

      {/* ─── Range footer ─── */}
      <div className="rounded-2xl border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
        <Clock className="mr-1 inline h-3 w-3" />
        Range: {new Date(data.rangeStart).toLocaleString("en-RW")} →{" "}
        {new Date(data.rangeEnd).toLocaleString("en-RW")}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function ReportCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-40 place-items-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
