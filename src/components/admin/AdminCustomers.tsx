"use client"

/**
 * AdminCustomers — customer management with CRM-style features.
 *
 * Section 7 enhancements:
 *   - Stats overview bar (Total, New this week, Repeat, VIP)
 *   - Auto-segmentation: VIP / Loyal / New / At-risk / Regular / Blocked
 *   - Segment + sort filters, CSV export
 *   - Loyalty tier badges (Bronze / Silver / Gold / Platinum)
 *   - Enhanced detail drawer: contact actions, AOV, loyalty progress,
 *     addresses, order history with payment status colors
 *   - Add / Subtract loyalty points modal (with audit reason)
 *   - Send SMS modal (uses /api/sms/send)
 *
 * Fetches from:
 *   GET  /api/admin/customers?search=...        (list)
 *   GET  /api/admin/customers/:id               (detail)
 *   PATCH /api/admin/customers/:id              (block/unblock/add_points/subtract_points)
 *   POST /api/sms/send                          (send SMS)
 */

import { useEffect, useState, useCallback, useMemo } from "react"
import { formatRWF, formatRWFCompact } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Users,
  UserPlus,
  Repeat,
  Crown,
  Ban,
  CheckCircle,
  Phone,
  Mail,
  ShoppingBag,
  DollarSign,
  Loader2,
  Download,
  MessageCircle,
  MessageSquare,
  Star,
  TrendingUp,
  MapPin,
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  createdAt: string
  loyaltyPoints: number
  orderCount: number
  totalSpent: number
  lastOrderDate: string | null
}

interface CustomerAddress {
  id: string
  label: string
  recipientName: string
  recipientPhone: string
  province: string
  district: string
  sector: string
  cell: string | null
  village: string | null
  streetAddress: string | null
  isDefault: boolean
}

interface CustomerDetail {
  customer: {
    id: string
    name: string
    phone: string
    email: string | null
    createdAt: string
    loyaltyPoints: number
    isDeleted: boolean
    addresses?: CustomerAddress[]
  }
  orders: {
    id: string
    orderNumber: string
    status: string
    total: number
    createdAt: string
    itemCount: number
    paymentMethod: string
    paymentStatus: string
    items: { name: string; quantity: number; price: number }[]
  }[]
  stats: {
    totalOrders: number
    totalSpent: number
    completedOrders: number
    cancelledOrders: number
  }
}

type SegmentKey =
  | "all"
  | "vip"
  | "loyal"
  | "new"
  | "at_risk"
  | "regular"
  | "blocked"

type SortKey =
  | "recent"
  | "spent_desc"
  | "orders_desc"
  | "loyalty_desc"
  | "name_asc"
  | "joined_desc"

// ============================================================================
// Constants — segments, loyalty tiers
// ============================================================================

const SEGMENT_LABELS: Record<Exclude<SegmentKey, "all">, string> = {
  vip: "VIP",
  loyal: "Loyal",
  new: "New",
  at_risk: "At-risk",
  regular: "Regular",
  blocked: "Blocked",
}

const SEGMENT_BADGES: Record<Exclude<SegmentKey, "all">, string> = {
  vip: "bg-amber-100 text-amber-800 border-amber-200",
  loyal: "bg-violet-100 text-violet-800 border-violet-200",
  new: "bg-sky-100 text-sky-800 border-sky-200",
  at_risk: "bg-orange-100 text-orange-800 border-orange-200",
  regular: "bg-secondary text-secondary-foreground",
  blocked: "bg-red-100 text-red-800 border-red-200",
}

const LOYALTY_TIERS = [
  { name: "Bronze",   min: 100,   color: "text-amber-700",   icon: "" },
  { name: "Silver",   min: 500,   color: "text-slate-500",   icon: "" },
  { name: "Gold",     min: 1000,  color: "text-yellow-600",  icon: "" },
  { name: "Platinum", min: 5000,  color: "text-indigo-600",  icon: "" },
] as const

const VIP_THRESHOLD = 100_000 // RWF total spent
const LOYAL_ORDER_THRESHOLD = 3
const NEW_CUSTOMER_DAYS = 14
const AT_RISK_DAYS = 60

// ============================================================================
// Helpers
// ============================================================================

type LoyaltyTier = {
  name: "Bronze" | "Silver" | "Gold" | "Platinum"
  min: number
  color: string
  icon: string
}

function getLoyaltyTier(points: number): {
  current: LoyaltyTier
  next: LoyaltyTier | null
  progress: number
} {
  let current: LoyaltyTier = LOYALTY_TIERS[0]
  let next: LoyaltyTier | null = null
  for (let i = 0; i < LOYALTY_TIERS.length; i++) {
    if (points >= LOYALTY_TIERS[i].min) {
      current = LOYALTY_TIERS[i]
      next = i + 1 < LOYALTY_TIERS.length ? LOYALTY_TIERS[i + 1] : null
    }
  }
  // Edge case: below Bronze threshold
  if (points < LOYALTY_TIERS[0].min) {
    next = LOYALTY_TIERS[0]
  }
  const progress = next
    ? Math.min(100, ((points - current.min) / (next.min - current.min)) * 100)
    : 100
  return { current, next, progress }
}

function classifySegment(c: Customer): Exclude<SegmentKey, "all"> {
  // Blocked takes precedence (we still show blocked customers if API returns them)
  // Note: API filters isDeleted=false by default, so blocked customers are rare here.
  if (c.totalSpent >= VIP_THRESHOLD) return "vip"
  if (c.orderCount >= LOYAL_ORDER_THRESHOLD) return "loyal"

  const joinedDate = new Date(c.createdAt)
  const daysSinceJoined = (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceJoined <= NEW_CUSTOMER_DAYS) return "new"

  if (c.orderCount > 0 && c.lastOrderDate) {
    const daysSinceLast = (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLast >= AT_RISK_DAYS) return "at_risk"
  }

  return "regular"
}

function formatDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-RW", opts || {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatRelative(iso: string | null) {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function normalizePhoneForWa(phone: string) {
  // Rwanda: +2507XXXXXXXX → 2507XXXXXXXX (strip leading +, spaces, leading 0)
  const p = phone.replace(/[\s+()-]/g, "")
  if (p.startsWith("250")) return p
  if (p.startsWith("0")) return "250" + p.slice(1)
  if (p.startsWith("7")) return "250" + p
  return p
}

// ============================================================================
// Component
// ============================================================================

export function AdminCustomers() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState<SegmentKey>("all")
  const [sortBy, setSortBy] = useState<SortKey>("recent")

  // Detail drawer
  const [selected, setSelected] = useState<Customer | null>(null)
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Modals
  const [pointsModal, setPointsModal] = useState<"add" | "subtract" | null>(null)
  const [smsModalOpen, setSmsModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("pageSize", "200")
      const res = await fetch(`/api/admin/customers?${params}`)
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (customer: Customer) => {
    setSelected(customer)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`)
      const data = await res.json()
      setDetail(data)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${id}`)
      const data = await res.json()
      setDetail(data)
      // Also refresh the row in the list
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                loyaltyPoints: data.customer.loyaltyPoints,
              }
            : c
        )
      )
      if (selected && selected.id === id) {
        setSelected((s) =>
          s ? { ...s, loyaltyPoints: data.customer.loyaltyPoints } : s
        )
      }
    } catch (e) {
      console.error(e)
    }
  }

  const toggleBlock = async (customer: Customer, action: "block" | "unblock") => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({
        title: action === "block" ? "Customer blocked" : "Customer unblocked",
        description: customer.name,
      })
      await refreshDetail(customer.id)
      load()
    } catch {
      toast({ title: "Action failed", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const adjustPoints = async (points: number, reason: string) => {
    if (!selected) return
    if (!points || points <= 0) {
      toast({ title: "Points must be a positive integer", variant: "destructive" })
      return
    }
    setActionLoading(true)
    try {
      const action = pointsModal === "add" ? "add_points" : "subtract_points"
      const res = await fetch(`/api/admin/customers/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, points, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast({
        title:
          pointsModal === "add"
            ? `+${points} points added`
            : `−${points} points subtracted`,
        description: `New balance: ${data.customer.loyaltyPoints} pts`,
      })
      setPointsModal(null)
      await refreshDetail(selected.id)
    } catch (e) {
      toast({
        title: "Adjustment failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const sendSms = async (phone: string, message: string) => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast({
        title: "SMS sent",
        description: `To ${phone}`,
      })
      setSmsModalOpen(false)
    } catch (e) {
      toast({
        title: "SMS failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- Derived data: stats, segments, filtered list ----------

  const stats = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    let newThisWeek = 0
    let repeatCount = 0
    let vipCount = 0
    let totalSpentAll = 0
    let totalOrdersAll = 0
    const segments: Record<Exclude<SegmentKey, "all">, number> = {
      vip: 0, loyal: 0, new: 0, at_risk: 0, regular: 0, blocked: 0,
    }
    for (const c of customers) {
      if (new Date(c.createdAt).getTime() >= weekAgo) newThisWeek++
      if (c.orderCount >= 2) repeatCount++
      if (c.totalSpent >= VIP_THRESHOLD) vipCount++
      totalSpentAll += c.totalSpent
      totalOrdersAll += c.orderCount
      const seg = classifySegment(c)
      segments[seg]++
    }
    const aov = totalOrdersAll > 0 ? totalSpentAll / totalOrdersAll : 0
    return {
      total: customers.length,
      newThisWeek,
      repeatCount,
      vipCount,
      aov,
      segments,
    }
  }, [customers])

  const filtered = useMemo(() => {
    let list = customers.slice()
    if (segment !== "all") {
      list = list.filter((c) => classifySegment(c) === segment)
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return (
            new Date(b.lastOrderDate || b.createdAt).getTime() -
            new Date(a.lastOrderDate || a.createdAt).getTime()
          )
        case "spent_desc":
          return b.totalSpent - a.totalSpent
        case "orders_desc":
          return b.orderCount - a.orderCount
        case "loyalty_desc":
          return b.loyaltyPoints - a.loyaltyPoints
        case "name_asc":
          return a.name.localeCompare(b.name)
        case "joined_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
    return list
  }, [customers, segment, sortBy])

  const exportCsv = () => {
    const header = [
      "Name", "Phone", "Email", "Joined", "Orders", "Total Spent (RWF)",
      "Loyalty Points", "Segment", "Last Order",
    ]
    const rows = filtered.map((c) => {
      const seg = classifySegment(c)
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        c.phone,
        c.email || "",
        new Date(c.createdAt).toISOString().split("T")[0],
        c.orderCount,
        c.totalSpent,
        c.loyaltyPoints,
        SEGMENT_LABELS[seg],
        c.lastOrderDate ? new Date(c.lastOrderDate).toISOString().split("T")[0] : "",
      ].join(",")
    })
    const csv = [header.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `freedom-customers-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({
      title: "CSV exported",
      description: `${filtered.length} customers`,
    })
  }

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            {customers.length} total · {stats.newThisWeek} new this week ·{" "}
            {stats.vipCount} VIP · AOV {formatRWFCompact(Math.round(stats.aov))}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats overview */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Total customers"
          value={stats.total.toString()}
          sub={`${stats.segments.loyal + stats.segments.vip} loyal+VIP`}
        />
        <StatCard
          icon={<UserPlus className="h-4 w-4 text-sky-600" />}
          label="New this week"
          value={stats.newThisWeek.toString()}
          sub={`${stats.segments.new} within 14 days`}
        />
        <StatCard
          icon={<Repeat className="h-4 w-4 text-violet-600" />}
          label="Repeat customers"
          value={stats.repeatCount.toString()}
          sub="2+ orders"
        />
        <StatCard
          icon={<Crown className="h-4 w-4 text-amber-600" />}
          label="VIP customers"
          value={stats.vipCount.toString()}
          sub={`≥ ${formatRWFCompact(VIP_THRESHOLD)} spent`}
        />
      </div>

      {/* Segment quick-filter chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <SegmentChip
          label="All"
          count={stats.total}
          active={segment === "all"}
          onClick={() => setSegment("all")}
        />
        {(Object.keys(SEGMENT_LABELS) as Array<Exclude<SegmentKey, "all">>).map(
          (seg) => (
            <SegmentChip
              key={seg}
              label={SEGMENT_LABELS[seg]}
              count={stats.segments[seg]}
              active={segment === seg}
              onClick={() => setSegment(seg)}
            />
          )
        )}
      </div>

      {/* Search + sort */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Last order date</SelectItem>
            <SelectItem value="spent_desc">Total spent (high → low)</SelectItem>
            <SelectItem value="orders_desc">Order count (high → low)</SelectItem>
            <SelectItem value="loyalty_desc">Loyalty points</SelectItem>
            <SelectItem value="name_asc">Name (A → Z)</SelectItem>
            <SelectItem value="joined_desc">Joined (newest first)</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Customers table */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 font-semibold">No customers found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {segment !== "all"
                ? `No ${SEGMENT_LABELS[segment as Exclude<SegmentKey, "all">].toLowerCase()} customers. Try another segment.`
                : search
                ? `No matches for "${search}".`
                : "Customers will appear here once they sign up."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Customer</th>
                  <th className="px-3 py-3 text-left font-medium">Phone</th>
                  <th className="px-3 py-3 text-center font-medium">Segment</th>
                  <th className="px-3 py-3 text-right font-medium">Orders</th>
                  <th className="px-3 py-3 text-right font-medium">Total spent</th>
                  <th className="px-3 py-3 text-center font-medium">Loyalty</th>
                  <th className="px-3 py-3 text-left font-medium">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.slice(0, 100).map((c) => {
                  const seg = classifySegment(c)
                  const tier = getLoyaltyTier(c.loyaltyPoints)
                  return (
                    <tr
                      key={c.id}
                      onClick={() => openDetail(c)}
                      className="cursor-pointer hover:bg-secondary/20"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            {c.email && (
                              <p className="text-xs text-muted-foreground">
                                {c.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">{c.phone}</td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEGMENT_BADGES[seg]}`}
                        >
                          {SEGMENT_LABELS[seg]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {c.orderCount}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatRWF(c.totalSpent)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {c.loyaltyPoints > 0 ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${tier.current.color}`}>
                            <span>{tier.current.icon}</span>
                            <span className="font-medium">{c.loyaltyPoints}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatRelative(c.lastOrderDate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 100 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Showing first 100 of {filtered.length} customers. Refine search to narrow results.
        </p>
      )}

      {/* ---------- Detail drawer ---------- */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Customer details</SheetTitle>
              </SheetHeader>

              {detailLoading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              ) : detail ? (
                <div className="mt-4 space-y-4">
                  {/* Profile hero */}
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xl font-semibold text-primary-foreground">
                        {selected.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{selected.name}</p>
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              SEGMENT_BADGES[classifySegment(selected)]
                            }`}
                          >
                            {SEGMENT_LABELS[classifySegment(selected)]}
                          </span>
                        </div>
                        <a
                          href={`tel:${selected.phone}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Phone className="h-3 w-3" /> {selected.phone}
                        </a>
                        {detail.customer.email && (
                          <a
                            href={`mailto:${detail.customer.email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                          >
                            <Mail className="h-3 w-3" /> {detail.customer.email}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Quick contact actions */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a
                        href={`https://wa.me/${normalizePhoneForWa(selected.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => setSmsModalOpen(true)}
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                        Send SMS
                      </Button>
                    </div>

                    {detail.customer.isDeleted && (
                      <Badge variant="destructive" className="mt-2">
                        <Ban className="mr-1 h-3 w-3" />
                        Blocked
                      </Badge>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <StatCell
                      icon={<ShoppingBag className="h-4 w-4 text-primary" />}
                      value={detail.stats.totalOrders.toString()}
                      label="Orders"
                    />
                    <StatCell
                      icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
                      value={formatRWFCompact(detail.stats.totalSpent)}
                      label="Spent"
                    />
                    <StatCell
                      icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
                      value={
                        detail.stats.totalOrders > 0
                          ? formatRWFCompact(
                              Math.round(
                                detail.stats.totalSpent / detail.stats.totalOrders
                              )
                            )
                          : "—"
                      }
                      label="Avg / order"
                    />
                    <StatCell
                      icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
                      value={detail.stats.completedOrders.toString()}
                      label="Delivered"
                    />
                    <StatCell
                      icon={<AlertCircle className="h-4 w-4 text-red-500" />}
                      value={detail.stats.cancelledOrders.toString()}
                      label="Cancelled"
                    />
                    <StatCell
                      icon={<Star className="h-4 w-4 text-amber-500" />}
                      value={detail.customer.loyaltyPoints.toString()}
                      label="Loyalty pts"
                    />
                  </div>

                  {/* Loyalty progress */}
                  {(() => {
                    const tier = getLoyaltyTier(detail.customer.loyaltyPoints)
                    return (
                      <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`flex items-center gap-1 font-semibold ${tier.current.color}`}>
                            <span>{tier.current.icon}</span>
                            {tier.current.name} member
                          </span>
                          {tier.next ? (
                            <span className="text-muted-foreground">
                              {tier.next.min - detail.customer.loyaltyPoints} pts to{" "}
                              <span className="font-medium">{tier.next.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Top tier reached</span>
                          )}
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                            style={{ width: `${tier.progress}%` }}
                          />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs"
                            onClick={() => setPointsModal("add")}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add points
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs"
                            onClick={() => setPointsModal("subtract")}
                            disabled={detail.customer.loyaltyPoints <= 0}
                          >
                            <Minus className="mr-1 h-3 w-3" />
                            Subtract
                          </Button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Addresses */}
                  {detail.customer.addresses &&
                    detail.customer.addresses.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          Saved addresses ({detail.customer.addresses.length})
                        </h3>
                        <div className="space-y-2">
                          {detail.customer.addresses.map((a) => (
                            <div
                              key={a.id}
                              className={`rounded-lg border p-3 text-xs ${
                                a.isDefault ? "border-primary/40 bg-primary/5" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{a.label}</span>
                                {a.isDefault && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-muted-foreground">
                                {a.recipientName} · {a.recipientPhone}
                              </p>
                              <p className="text-muted-foreground">
                                {a.sector}, {a.district}, {a.province}
                                {a.cell ? `, ${a.cell}` : ""}
                              </p>
                              {a.streetAddress && (
                                <p className="text-muted-foreground">{a.streetAddress}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Block/Unblock */}
                  <Button
                    variant={detail.customer.isDeleted ? "default" : "destructive"}
                    className="w-full"
                    disabled={actionLoading}
                    onClick={() =>
                      toggleBlock(
                        selected,
                        detail.customer.isDeleted ? "unblock" : "block"
                      )
                    }
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : detail.customer.isDeleted ? (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <Ban className="mr-2 h-4 w-4" />
                    )}
                    {detail.customer.isDeleted ? "Unblock customer" : "Block customer"}
                  </Button>

                  {/* Order history */}
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ShoppingBag className="mr-1 inline h-3 w-3" />
                      Order history ({detail.orders.length})
                    </h3>
                    <div className="space-y-2">
                      {detail.orders.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                          No orders yet.
                        </p>
                      ) : (
                        detail.orders.map((o) => (
                          <div key={o.id} className="rounded-lg border p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-medium">
                                {o.orderNumber}
                              </span>
                              <span className="font-semibold">
                                {formatRWF(o.total)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {o.itemCount} items · {o.paymentMethod}
                              </span>
                              <span>{formatDate(o.createdAt, { day: "numeric", month: "short" })}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <OrderStatusBadge status={o.status} />
                              <PaymentStatusBadge status={o.paymentStatus} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Joined date */}
                  <p className="text-center text-xs text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Customer since {formatDate(detail.customer.createdAt)}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ---------- Add / Subtract points modal ---------- */}
      {pointsModal && selected && (
        <PointsModal
          mode={pointsModal}
          customerName={selected.name}
          currentPoints={detail?.customer.loyaltyPoints ?? selected.loyaltyPoints}
          loading={actionLoading}
          onClose={() => setPointsModal(null)}
          onSubmit={adjustPoints}
        />
      )}

      {/* ---------- Send SMS modal ---------- */}
      {smsModalOpen && selected && (
        <SmsModal
          phone={selected.phone}
          customerName={selected.name}
          loading={actionLoading}
          onClose={() => setSmsModalOpen(false)}
          onSubmit={sendSms}
        />
      )}
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
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
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function StatCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <div className="mx-auto mb-1 w-fit">{icon}</div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

function SegmentChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-secondary"
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-sky-100 text-sky-700",
    PROCESSING: "bg-indigo-100 text-indigo-700",
    SHIPPED: "bg-violet-100 text-violet-700",
    OUT_FOR_DELIVERY: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
    RETURNED: "bg-orange-100 text-orange-700",
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
        map[status] || "bg-secondary text-secondary-foreground"
      }`}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
    REFUNDED: "bg-purple-100 text-purple-700",
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
        map[status] || "bg-secondary text-secondary-foreground"
      }`}
    >
      {status}
    </span>
  )
}

// ============================================================================
// Modal: Add / Subtract loyalty points
// ============================================================================

function PointsModal({
  mode,
  customerName,
  currentPoints,
  loading,
  onClose,
  onSubmit,
}: {
  mode: "add" | "subtract"
  customerName: string
  currentPoints: number
  loading: boolean
  onClose: () => void
  onSubmit: (points: number, reason: string) => void
}) {
  const [points, setPoints] = useState("")
  const [reason, setReason] = useState("")
  const isAdd = mode === "add"
  const maxSubtract = currentPoints

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <div
            className={`grid h-9 w-9 place-items-center rounded-full ${
              isAdd ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isAdd ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-lg font-bold">
              {isAdd ? "Add loyalty points" : "Subtract loyalty points"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {customerName} · Current: {currentPoints} pts
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Points {isAdd ? "to add" : `to subtract (max ${maxSubtract})`}
            </label>
            <Input
              type="number"
              min="1"
              max={isAdd ? undefined : maxSubtract}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g., 100"
              className="h-10"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Reason (visible in audit log)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Apology for delayed delivery"
              rows={2}
              className="resize-none"
              maxLength={200}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {reason.length}/200
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className={`flex-1 ${
              isAdd
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            disabled={loading || !points || Number(points) <= 0}
            onClick={() => onSubmit(Number(points), reason || "Admin adjustment")}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isAdd ? (
              <Plus className="mr-2 h-4 w-4" />
            ) : (
              <Minus className="mr-2 h-4 w-4" />
            )}
            {isAdd ? "Add points" : "Subtract points"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Modal: Send SMS to a customer
// ============================================================================

function SmsModal({
  phone,
  customerName,
  loading,
  onClose,
  onSubmit,
}: {
  phone: string
  customerName: string
  loading: boolean
  onClose: () => void
  onSubmit: (phone: string, message: string) => void
}) {
  const [message, setMessage] = useState("")
  const MAX = 160

  const templates = [
    {
      label: "Personal promo",
      text: `Hello ${customerName}! Enjoy 15% off your next order with code THANKS15. Valid 7 days. — FreedomCosmeticShop`,
    },
    {
      label: "Order follow-up",
      text: `Muraho ${customerName}! We hope you love your FreedomCosmeticShop products. Reply to share feedback. Thank you!`,
    },
    {
      label: "Birthday greeting",
      text: `Happy birthday ${customerName}! Enjoy a free gift on your next order. Just show this SMS at checkout. — FreedomCosmeticShop`,
    },
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Send SMS</h3>
            <p className="text-xs text-muted-foreground">
              To {customerName} · {phone}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Templates */}
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setMessage(t.text)}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary"
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
              placeholder="Type your message..."
              rows={4}
              className="resize-none"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Sent via Africa's Talking / Pindo</span>
              <span className={message.length > MAX - 20 ? "text-amber-600" : ""}>
                {message.length}/{MAX}
              </span>
            </div>
          </div>

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
             Standard SMS rates apply. Bilingual (EN/KIN) messages count as 2 SMS per send.
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={loading || !message.trim()}
            onClick={() => onSubmit(phone, message)}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            Send SMS
          </Button>
        </div>
      </div>
    </div>
  )
}
