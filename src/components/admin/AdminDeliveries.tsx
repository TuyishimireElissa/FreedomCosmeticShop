"use client"

/**
 * AdminDeliveries — delivery management with rider assignment + tracking.
 */

import { useEffect, useState, useCallback } from "react"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  CheckCircle2,
  Loader2,
  Package,
  Clock,
} from "lucide-react"

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
    items: { name: string; quantity: number }[]
  }
}

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

export function AdminDeliveries() {
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [selected, setSelected] = useState<Delivery | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [riderName, setRiderName] = useState("")
  const [riderPhone, setRiderPhone] = useState("")
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/deliveries?${params}`)
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setDeliveries(data.deliveries || [])
      setStats(data.stats || { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, failed: 0 })
    } catch {
      // Network error
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = (delivery: Delivery) => {
    setSelected(delivery)
    setRiderName(delivery.driverName || "")
    setRiderPhone(delivery.driverPhone || "")
    setVehiclePlate(delivery.vehiclePlate || "")
    setDetailOpen(true)
  }

  const updateStatus = async (deliveryId: string, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setSelected(data.delivery)
      toast({ title: `Status updated to ${newStatus}` })
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
      setSelected(data.delivery)
      toast({ title: "Rider assigned", description: riderName })
      load()
    } catch {
      toast({ title: "Assignment failed", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">Deliveries</h2>
        <p className="text-sm text-muted-foreground">Manage delivery assignments and tracking</p>
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
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
                      <p className="text-muted-foreground">{d.order.province}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {d.driverName ? (
                        <div>
                          <p className="font-medium">{d.driverName}</p>
                          <p className="text-muted-foreground">{d.driverPhone}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">— Not assigned —</span>
                      )}
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

      {/* Detail drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Delivery for {selected.order.orderNumber}</SheetTitle>
                <SheetDescription>
                  {selected.order.customerName} · {selected.order.district}, {selected.order.province}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-sm font-medium">Current status</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[selected.status] || ""
                    }`}
                  >
                    {selected.status.replace("_", " ")}
                  </span>
                </div>

                {/* Delivery address */}
                <div className="rounded-xl border p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Delivery address
                  </h3>
                  <p className="mt-2 flex items-start gap-1.5 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {selected.order.address}
                      <br />
                      {selected.order.sector || selected.order.city}
                      {selected.order.district ? `, ${selected.order.district}` : ""}
                      <br />
                      {selected.order.province}
                    </span>
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" /> {selected.order.customerPhone}
                  </p>
                </div>

                {/* Items */}
                <div className="rounded-xl border p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        />
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

                {/* Rider info (if assigned) */}
                {selected.driverName && (
                  <div className="rounded-xl border p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rider
                    </h3>
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
                            <Clock className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Mark as {next.replace("_", " ").toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {selected.status !== "PENDING" && (
                  <div className="rounded-xl border p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Timeline
                    </h3>
                    <div className="mt-3 space-y-2 text-sm">
                      {selected.assignedAt && (
                        <p className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          Assigned: {new Date(selected.assignedAt).toLocaleString("en-RW")}
                        </p>
                      )}
                      {selected.pickedUpAt && (
                        <p className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          Picked up: {new Date(selected.pickedUpAt).toLocaleString("en-RW")}
                        </p>
                      )}
                      {selected.deliveredAt && (
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Delivered: {new Date(selected.deliveredAt).toLocaleString("en-RW")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
