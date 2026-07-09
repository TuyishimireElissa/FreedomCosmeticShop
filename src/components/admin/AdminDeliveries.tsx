"use client"

/**
 * AdminDeliveries — Section 8 enhanced delivery management.
 *
 * Section 8 enhancements:
 *   - Province quick-filter chips (Kigali / Northern / Southern / Eastern / Western)
 *   - Rider roster side-panel (auto-derived from deliveries):
 *       · Active count, completed count, failed count
 *       · Click-to-call + WhatsApp + filter-this-rider
 *       · Last assigned time
 *   - Enhanced table: ETA badge, address map link, rider chip with phone
 *   - Enhanced detail drawer:
 *       · Click-to-call customer + WhatsApp
 *       · Address "View on map" OpenStreetMap deep-link
 *       · Failure reason capture on FAILED status
 *       · Notes editor (admin notes)
 *       · Enhanced timeline with status icons
 *       · "Notify customer by SMS" button — sends ORDER_SHIPPED template
 *         pre-filled with rider name + phone + ETA
 *   - Bulk-assign modal: assign a rider to multiple PENDING deliveries at once
 *
 * Fetches from:
 *   GET    /api/admin/deliveries?status=&province=&riderPhone=&search=
 *   PATCH  /api/admin/deliveries/:id   (assign rider, update status, notes)
 *   POST   /api/sms/send               (notify customer)
 */

import { useEffect, useState, useCallback, useMemo } from "react"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Search,
  Truck,
  MapPin,
  Phone,
  User,
  UserCheck,
  CheckCircle2,
  Loader2,
  Package,
  Clock,
  XCircle,
  MessageCircle,
  MessageSquare,
  Navigation,
  ExternalLink,
  Bike,
  Users,
  Send,
  RefreshCw,
  AlertCircle,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface DeliveryOrderItem {
  name: string
  quantity: number
}

interface Delivery {
  id: string
  status: string
  driverName: string | null
  driverPhone: string | null
  vehiclePlate: string | null
  trackingCode: string | null
  estimatedArrival: string | null
  actualArrival: string | null
  assignedAt: string | null
  pickedUpAt: string | null
  deliveredAt: string | null
  notes: string | null
  failureReason: string | null
  order: {
    id: string
    orderNumber: string
    customerName: string
    customerPhone: string
    address: string
    city: string
    district: string | null
    sector: string | null
    province: string
    total: number
    status: string
    items: DeliveryOrderItem[]
  }
}

interface RiderStat {
  driverName: string
  driverPhone: string
  vehiclePlate: string | null
  activeCount: number
  doneCount: number
  failedCount: number
  lastAssignedAt: string | null
}

interface DeliveryStats {
  total: number
  pending: number
  assigned: number
  inTransit: number
  delivered: number
  failed: number
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  PICKED_UP: "bg-purple-100 text-purple-700",
  IN_TRANSIT: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
}

const STATUS_NEXT: Record<string, string[]> = {
  PENDING: ["ASSIGNED"],
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: ["PENDING"],
}

const PROVINCES = [
  { value: "all", label: "All provinces" },
  { value: "Kigali City", label: "Kigali City" },
  { value: "Northern Province", label: "Northern" },
  { value: "Southern Province", label: "Southern" },
  { value: "Eastern Province", label: "Eastern" },
  { value: "Western Province", label: "Western" },
] as const

const PROVINCE_SHORT: Record<string, string> = {
  "Kigali City": "Kigali",
  "Northern Province": "Northern",
  "Southern Province": "Southern",
  "Eastern Province": "Eastern",
  "Western Province": "Western",
}

// ============================================================================
// Helpers
// ============================================================================

function normalizePhone(phone: string) {
  const p = phone.replace(/[\s+()-]/g, "")
  if (p.startsWith("250")) return p
  if (p.startsWith("0")) return "250" + p.slice(1)
  if (p.startsWith("7")) return "250" + p
  return p
}

function osmLink(d: Delivery): string {
  const q = [
    d.order.address,
    d.order.sector,
    d.order.district,
    "Rwanda",
  ]
    .filter(Boolean)
    .join(", ")
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-RW", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function etaLabel(d: Delivery): string {
  if (d.deliveredAt) return "Delivered"
  if (d.status === "FAILED") return "Failed"
  if (d.estimatedArrival) {
    const date = new Date(d.estimatedArrival)
    const now = new Date()
    const sameDay = date.toDateString() === now.toDateString()
    if (sameDay) return `Today ${date.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}`
    return date.toLocaleDateString("en-RW", { day: "numeric", month: "short" })
  }
  // Infer from province
  const isKigali = d.order.province === "Kigali City"
  return isKigali ? "Today" : "2-3 days"
}

// ============================================================================
// Component
// ============================================================================

export function AdminDeliveries() {
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [riders, setRiders] = useState<RiderStat[]>([])
  const [stats, setStats] = useState<DeliveryStats>({
    total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, failed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [provinceFilter, setProvinceFilter] = useState<string>("all")
  const [riderPhoneFilter, setRiderPhoneFilter] = useState<string>("")
  const [search, setSearch] = useState("")

  const [selected, setSelected] = useState<Delivery | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [riderName, setRiderName] = useState("")
  const [riderPhone, setRiderPhone] = useState("")
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [failureReason, setFailureReason] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [updating, setUpdating] = useState(false)

  // Bulk-assign modal
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [bulkRiderName, setBulkRiderName] = useState("")
  const [bulkRiderPhone, setBulkRiderPhone] = useState("")
  const [bulkVehiclePlate, setBulkVehiclePlate] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (provinceFilter !== "all") params.set("province", provinceFilter)
      if (riderPhoneFilter) params.set("riderPhone", riderPhoneFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/deliveries?${params}`)
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setDeliveries(data.deliveries || [])
      setRiders(data.riders || [])
      setStats(
        data.stats || { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, failed: 0 }
      )
    } catch {
      // Network error
    } finally {
      setLoading(false)
    }
  }, [statusFilter, provinceFilter, riderPhoneFilter, search])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = (delivery: Delivery) => {
    setSelected(delivery)
    setRiderName(delivery.driverName || "")
    setRiderPhone(delivery.driverPhone || "")
    setVehiclePlate(delivery.vehiclePlate || "")
    setFailureReason(delivery.failureReason || "")
    setAdminNotes(delivery.notes || "")
    setDetailOpen(true)
  }

  const refreshSelected = (updated: Delivery) => {
    setSelected(updated)
    setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  const updateStatus = async (deliveryId: string, newStatus: string) => {
    setUpdating(true)
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (newStatus === "FAILED" && failureReason) {
        body.failureReason = failureReason
      }
      const res = await fetch(`/api/admin/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      refreshSelected(data.delivery)
      toast({
        title: `Status: ${newStatus.replace("_", " ")}`,
        description: failureReason && newStatus === "FAILED" ? failureReason : undefined,
      })
      load()
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const assignRider = async () => {
    if (!selected) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/deliveries/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: riderName,
          driverPhone: riderPhone,
          vehiclePlate,
          status: "ASSIGNED",
        }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      refreshSelected(data.delivery)
      toast({ title: "Rider assigned", description: riderName })
      load()
    } catch {
      toast({ title: "Assignment failed", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const saveNotes = async () => {
    if (!selected) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/deliveries/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: adminNotes }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      refreshSelected(data.delivery)
      toast({ title: "Notes saved" })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const notifyCustomer = async () => {
    if (!selected || !selected.driverName || !selected.driverPhone) {
      toast({
        title: "Cannot notify",
        description: "Assign a rider first.",
        variant: "destructive",
      })
      return
    }
    setUpdating(true)
    try {
      const message = `Your order ${selected.order.orderNumber} is on the way! Rider: ${selected.driverName} - ${selected.driverPhone}. ETA: ${etaLabel(selected)}. FreedomCosmeticShop 🏍️`
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selected.order.customerPhone,
          message,
          templateKey: "ORDER_SHIPPED",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast({
        title: "Customer notified via SMS",
        description: `To ${selected.order.customerPhone}`,
      })
    } catch (e) {
      toast({
        title: "SMS failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  // ----- Bulk assign -----

  const pendingDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "PENDING"),
    [deliveries]
  )

  const toggleBulk = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkSelectAll = () => {
    if (bulkSelected.size === pendingDeliveries.length) {
      setBulkSelected(new Set())
    } else {
      setBulkSelected(new Set(pendingDeliveries.map((d) => d.id)))
    }
  }

  const submitBulkAssign = async () => {
    if (bulkSelected.size === 0 || !bulkRiderName || !bulkRiderPhone) {
      toast({ title: "Select deliveries and rider info", variant: "destructive" })
      return
    }
    setUpdating(true)
    let success = 0
    let fail = 0
    try {
      for (const id of bulkSelected) {
        try {
          const res = await fetch(`/api/admin/deliveries/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driverName: bulkRiderName,
              driverPhone: bulkRiderPhone,
              vehiclePlate: bulkVehiclePlate,
              status: "ASSIGNED",
            }),
          })
          if (res.ok) success++
          else fail++
        } catch {
          fail++
        }
      }
      toast({
        title: `Bulk assign complete`,
        description: `${success} assigned${fail > 0 ? `, ${fail} failed` : ""}`,
      })
      setBulkOpen(false)
      setBulkSelected(new Set())
      setBulkRiderName("")
      setBulkRiderPhone("")
      setBulkVehiclePlate("")
      load()
    } finally {
      setUpdating(false)
    }
  }

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Deliveries</h2>
          <p className="text-sm text-muted-foreground">
            Manage rider assignments, tracking, and customer notifications
          </p>
        </div>
        {pendingDeliveries.length > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setBulkOpen(true)}
            className="gap-1.5"
          >
            <Users className="h-4 w-4" />
            Bulk assign ({pendingDeliveries.length})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Assigned", value: stats.assigned, color: "text-blue-600" },
          { label: "In transit", value: stats.inTransit, color: "text-indigo-600" },
          { label: "Delivered", value: stats.delivered, color: "text-emerald-600" },
          { label: "Failed", value: stats.failed, color: "text-red-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Layout: table + rider roster */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div>
          {/* Province quick-filter chips */}
          <div className="mb-3 flex flex-wrap gap-2">
            {PROVINCES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProvinceFilter(p.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  provinceFilter === p.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {p.label}
              </button>
            ))}
            {riderPhoneFilter && (
              <button
                type="button"
                onClick={() => setRiderPhoneFilter("")}
                className="flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
              >
                <Bike className="h-3 w-3" />
                Rider: {riders.find((r) => r.driverPhone === riderPhoneFilter)?.driverName}
                <XCircle className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order #, customer, or rider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
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
            <Button variant="outline" size="icon" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            {loading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : deliveries.length === 0 ? (
              <div className="grid place-items-center py-16 text-center">
                <Truck className="h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-3 font-semibold">No deliveries found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different filter or check back later.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">Order</th>
                      <th className="px-3 py-3 text-left font-medium">Customer</th>
                      <th className="px-3 py-3 text-left font-medium">Destination</th>
                      <th className="px-3 py-3 text-left font-medium">Rider</th>
                      <th className="px-3 py-3 text-center font-medium">ETA</th>
                      <th className="px-3 py-3 text-left font-medium">Status</th>
                      <th className="px-3 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deliveries.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => openDetail(d)}
                        className="cursor-pointer hover:bg-secondary/20"
                      >
                        <td className="px-3 py-3 font-mono text-xs font-medium">
                          {d.order.orderNumber}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{d.order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{d.order.customerPhone}</p>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <p>{d.order.district || d.order.city}</p>
                          <p className="text-muted-foreground">
                            {PROVINCE_SHORT[d.order.province] || d.order.province}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {d.driverName ? (
                            <div>
                              <p className="font-medium">{d.driverName}</p>
                              <p className="text-muted-foreground">{d.driverPhone}</p>
                            </div>
                          ) : (
                            <span className="text-amber-600">— Unassigned —</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-xs">
                          <span className="inline-block rounded-md bg-secondary px-2 py-0.5 font-medium">
                            {etaLabel(d)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[d.status] || ""
                            }`}
                          >
                            {d.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          {formatRWF(d.order.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Rider roster side panel */}
        <div>
          <div className="sticky top-4 rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bike className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Riders on duty</h3>
              <Badge2 className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                {riders.length}
              </Badge2>
            </div>

            {riders.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                No riders assigned to any delivery yet.
              </p>
            ) : (
              <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                {riders.map((r) => (
                  <div
                    key={r.driverPhone}
                    className={`rounded-xl border p-3 transition-colors ${
                      riderPhoneFilter === r.driverPhone
                        ? "border-violet-400 bg-violet-50"
                        : "hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.driverName}</p>
                        <p className="text-xs text-muted-foreground">{r.driverPhone}</p>
                        {r.vehiclePlate && (
                          <p className="text-[10px] text-muted-foreground">
                            Plate: {r.vehiclePlate}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <a
                          href={`tel:${r.driverPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                          title="Call rider"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                        <a
                          href={`https://wa.me/${normalizePhone(r.driverPhone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          title="WhatsApp rider"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                        <Clock className="h-2.5 w-2.5" />
                        {r.activeCount} active
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {r.doneCount} done
                      </span>
                      {r.failedCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">
                          <XCircle className="h-2.5 w-2.5" />
                          {r.failedCount}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full text-xs"
                      onClick={() =>
                        setRiderPhoneFilter(
                          riderPhoneFilter === r.driverPhone ? "" : r.driverPhone
                        )
                      }
                    >
                      <FilterIcon /> {riderPhoneFilter === r.driverPhone ? "Clear filter" : "Show only this rider"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Detail drawer ---------- */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Delivery for {selected.order.orderNumber}</SheetTitle>
                <SheetDescription>
                  {selected.order.customerName} · {selected.order.district || selected.order.city},{" "}
                  {PROVINCE_SHORT[selected.order.province] || selected.order.province}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Status + ETA */}
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Current status</span>
                    <span
                      className={`ml-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[selected.status] || ""
                      }`}
                    >
                      {selected.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">ETA</span>
                    <p className="text-sm font-semibold">{etaLabel(selected)}</p>
                  </div>
                </div>

                {/* Delivery address with map link */}
                <div className="rounded-xl border p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      Delivery address
                    </h3>
                    <a
                      href={osmLink(selected)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on map
                    </a>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-sm">
                    <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {selected.order.address}
                      <br />
                      {selected.order.sector || selected.order.city}
                      {selected.order.district ? `, ${selected.order.district}` : ""}
                      <br />
                      {selected.order.province}
                    </span>
                  </p>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`tel:${selected.order.customerPhone}`}
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call customer
                    </a>
                    <a
                      href={`https://wa.me/${normalizePhone(selected.order.customerPhone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-600"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </div>
                </div>

                {/* Items */}
                <div className="rounded-xl border p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Package className="mr-1 inline h-3 w-3" />
                    Items ({selected.order.items.length})
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {selected.order.items.map((item, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">× {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t pt-2 text-sm font-semibold">
                    Total: {formatRWF(selected.order.total)}
                  </p>
                </div>

                {/* Rider assignment (if PENDING) */}
                {selected.status === "PENDING" && (
                  <div className="rounded-xl border p-4">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <User className="h-4 w-4 text-primary" /> Assign rider
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label htmlFor="rider-name">Rider name</Label>
                        <Input
                          id="rider-name"
                          value={riderName}
                          onChange={(e) => setRiderName(e.target.value)}
                          placeholder="e.g. Eric M."
                          list="rider-suggestions"
                        />
                        <datalist id="rider-suggestions">
                          {riders.map((r) => (
                            <option key={r.driverPhone} value={r.driverName}>
                              {r.driverPhone}
                              {r.vehiclePlate ? ` · ${r.vehiclePlate}` : ""}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <Label htmlFor="rider-phone">Rider phone</Label>
                        <Input
                          id="rider-phone"
                          value={riderPhone}
                          onChange={(e) => setRiderPhone(e.target.value)}
                          placeholder="0788123456"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicle">Vehicle plate (optional)</Label>
                        <Input
                          id="vehicle"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          placeholder="RAB 123 A"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={assignRider}
                        disabled={!riderName || !riderPhone || updating}
                      >
                        {updating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Truck className="mr-2 h-4 w-4" />
                        )}
                        Assign rider
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rider info + Notify customer (if assigned) */}
                {selected.driverName && (
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Bike className="mr-1 inline h-3 w-3" />
                        Rider
                      </h3>
                      <div className="flex gap-1">
                        <a
                          href={`tel:${selected.driverPhone}`}
                          className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                          title="Call rider"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                        <a
                          href={`https://wa.me/${normalizePhone(selected.driverPhone || "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          title="WhatsApp rider"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <p className="mt-2 font-medium">{selected.driverName}</p>
                    <p className="text-sm text-muted-foreground">{selected.driverPhone}</p>
                    {selected.vehiclePlate && (
                      <p className="text-xs text-muted-foreground">Plate: {selected.vehiclePlate}</p>
                    )}
                    {selected.trackingCode && (
                      <p className="mt-1 text-xs">
                        Tracking: <span className="font-mono">{selected.trackingCode}</span>
                      </p>
                    )}

                    {/* Notify customer */}
                    {selected.status !== "DELIVERED" && selected.status !== "FAILED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={notifyCustomer}
                        disabled={updating}
                      >
                        {updating ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-3.5 w-3.5" />
                        )}
                        Notify customer by SMS
                      </Button>
                    )}
                  </div>
                )}

                {/* Status actions */}
                {STATUS_NEXT[selected.status]?.length > 0 && (
                  <div className="rounded-xl border p-4">
                    <h3 className="text-sm font-semibold">Update status</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {STATUS_NEXT[selected.status].map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={next === "FAILED" ? "destructive" : "default"}
                          onClick={() => updateStatus(selected.id, next)}
                          disabled={updating}
                        >
                          {next === "FAILED" ? (
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Mark as {next.replace("_", " ").toLowerCase()}
                        </Button>
                      ))}
                    </div>

                    {/* Failure reason capture */}
                    {STATUS_NEXT[selected.status].includes("FAILED") && (
                      <div className="mt-3">
                        <Label htmlFor="failure-reason" className="text-xs">
                          Failure reason (saved when marking as failed)
                        </Label>
                        <Textarea
                          id="failure-reason"
                          value={failureReason}
                          onChange={(e) => setFailureReason(e.target.value)}
                          placeholder="e.g. Customer not reachable, wrong address..."
                          rows={2}
                          className="resize-none"
                          maxLength={300}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Admin notes editor */}
                <div className="rounded-xl border p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MessageSquare className="mr-1 inline h-3 w-3" />
                    Admin notes
                  </h3>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this delivery (not visible to customer)..."
                    rows={3}
                    className="mt-2 resize-none"
                    maxLength={500}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {adminNotes.length}/500
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveNotes}
                      disabled={updating}
                    >
                      {updating ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Save notes
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                {selected.status !== "PENDING" && (
                  <div className="rounded-xl border p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      Timeline
                    </h3>
                    <ol className="mt-3 space-y-3 border-l border-border pl-4 text-sm">
                      {selected.assignedAt && (
                        <TimelineItem
                          icon={<UserCheck className="h-3.5 w-3.5 text-blue-500" />}
                          label="Assigned"
                          date={selected.assignedAt}
                          sub={selected.driverName || ""}
                        />
                      )}
                      {selected.pickedUpAt && (
                        <TimelineItem
                          icon={<Package className="h-3.5 w-3.5 text-purple-500" />}
                          label="Picked up"
                          date={selected.pickedUpAt}
                        />
                      )}
                      {selected.deliveredAt && (
                        <TimelineItem
                          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                          label="Delivered"
                          date={selected.deliveredAt}
                        />
                      )}
                      {selected.status === "FAILED" && (
                        <TimelineItem
                          icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
                          label="Failed"
                          sub={selected.failureReason || "No reason given"}
                        />
                      )}
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ---------- Bulk assign modal ---------- */}
      {bulkOpen && (
        <BulkAssignModal
          pendingDeliveries={pendingDeliveries}
          bulkSelected={bulkSelected}
          bulkRiderName={bulkRiderName}
          bulkRiderPhone={bulkRiderPhone}
          bulkVehiclePlate={bulkVehiclePlate}
          loading={updating}
          onToggle={toggleBulk}
          onToggleAll={bulkSelectAll}
          onRiderNameChange={setBulkRiderName}
          onRiderPhoneChange={setBulkRiderPhone}
          onVehiclePlateChange={setBulkVehiclePlate}
          onSubmit={submitBulkAssign}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function Badge2({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return <span className={className}>{children}</span>
}

function FilterIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-1"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function TimelineItem({
  icon,
  label,
  date,
  sub,
}: {
  icon: React.ReactNode
  label: string
  date?: string | null
  sub?: string
}) {
  return (
    <li className="relative">
      <span className="absolute -left-[1.40rem] grid h-5 w-5 place-items-center rounded-full border border-border bg-card">
        {icon}
      </span>
      <p className="font-medium">{label}</p>
      {date && (
        <p className="text-xs text-muted-foreground">{formatDateTime(date)}</p>
      )}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </li>
  )
}

// ============================================================================
// Bulk Assign Modal
// ============================================================================

function BulkAssignModal({
  pendingDeliveries,
  bulkSelected,
  bulkRiderName,
  bulkRiderPhone,
  bulkVehiclePlate,
  loading,
  onToggle,
  onToggleAll,
  onRiderNameChange,
  onRiderPhoneChange,
  onVehiclePlateChange,
  onSubmit,
  onClose,
}: {
  pendingDeliveries: Delivery[]
  bulkSelected: Set<string>
  bulkRiderName: string
  bulkRiderPhone: string
  bulkVehiclePlate: string
  loading: boolean
  onToggle: (id: string) => void
  onToggleAll: () => void
  onRiderNameChange: (v: string) => void
  onRiderPhoneChange: (v: string) => void
  onVehiclePlateChange: (v: string) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const allSelected = bulkSelected.size === pendingDeliveries.length && pendingDeliveries.length > 0

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Bulk assign rider</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Rider form */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Rider name</Label>
              <Input
                value={bulkRiderName}
                onChange={(e) => onRiderNameChange(e.target.value)}
                placeholder="e.g. Eric M."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Rider phone</Label>
              <Input
                value={bulkRiderPhone}
                onChange={(e) => onRiderPhoneChange(e.target.value)}
                placeholder="0788123456"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Vehicle plate (optional)</Label>
              <Input
                value={bulkVehiclePlate}
                onChange={(e) => onVehiclePlateChange(e.target.value)}
                placeholder="RAB 123 A"
                className="mt-1"
              />
            </div>
          </div>

          {/* Pending deliveries list */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pending deliveries ({pendingDeliveries.length})
            </p>
            <button
              type="button"
              onClick={onToggleAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          {pendingDeliveries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 opacity-40" />
              No pending deliveries to assign.
            </div>
          ) : (
            <div className="max-h-[300px] space-y-1 overflow-y-auto">
              {pendingDeliveries.map((d) => {
                const checked = bulkSelected.has(d.id)
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(d.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-medium">{d.order.orderNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.order.customerName} · {d.order.district || d.order.city}
                      </p>
                    </div>
                    <p className="text-xs font-medium">{formatRWF(d.order.total)}</p>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t p-4">
          <p className="text-xs text-muted-foreground">
            {bulkSelected.size} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={
                loading ||
                bulkSelected.size === 0 ||
                !bulkRiderName ||
                !bulkRiderPhone
              }
              onClick={onSubmit}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              Assign to {bulkSelected.size || 0} {bulkSelected.size === 1 ? "delivery" : "deliveries"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
