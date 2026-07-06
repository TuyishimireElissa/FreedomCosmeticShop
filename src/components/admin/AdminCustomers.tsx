"use client"

/**
 * AdminCustomers — customer management with search, spending, block/unblock.
 */

import { useEffect, useState, useCallback } from "react"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { Search, Users, Ban, CheckCircle, Phone, Mail, ShoppingBag, DollarSign, Loader2 } from "lucide-react"

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

interface CustomerDetail {
  customer: {
    id: string
    name: string
    phone: string
    email: string | null
    createdAt: string
    loyaltyPoints: number
    isDeleted: boolean
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

export function AdminCustomers() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Customer | null>(null)
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
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
      // Refresh detail
      const detailRes = await fetch(`/api/admin/customers/${customer.id}`)
      setDetail(await detailRes.json())
      load()
    } catch {
      toast({ title: "Action failed", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 font-semibold">No customers found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Customer</th>
                  <th className="px-3 py-3 text-left font-medium">Phone</th>
                  <th className="px-3 py-3 text-right font-medium">Orders</th>
                  <th className="px-3 py-3 text-right font-medium">Total spent</th>
                  <th className="px-3 py-3 text-left font-medium">Joined</th>
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((c) => (
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
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">{c.phone}</td>
                    <td className="px-3 py-3 text-right font-medium">{c.orderCount}</td>
                    <td className="px-3 py-3 text-right font-medium">
                      {formatRWF(c.totalSpent)}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("en-RW", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {c.loyaltyPoints > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {c.loyaltyPoints} pts
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer detail drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Customer details</SheetTitle>
              </SheetHeader>

              {detailLoading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              ) : detail ? (
                <div className="mt-4 space-y-4">
                  {/* Profile */}
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                        {selected.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{selected.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {selected.phone}
                        </p>
                        {detail.customer.email && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {detail.customer.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {detail.customer.isDeleted && (
                      <Badge variant="destructive" className="mt-2">
                        Blocked
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border p-3 text-center">
                      <ShoppingBag className="mx-auto h-4 w-4 text-primary" />
                      <p className="mt-1 text-lg font-bold">{detail.stats.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Orders</p>
                    </div>
                    <div className="rounded-xl border p-3 text-center">
                      <DollarSign className="mx-auto h-4 w-4 text-primary" />
                      <p className="mt-1 text-sm font-bold">{formatRWF(detail.stats.totalSpent)}</p>
                      <p className="text-xs text-muted-foreground">Spent</p>
                    </div>
                    <div className="rounded-xl border p-3 text-center">
                      <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                      <p className="mt-1 text-lg font-bold">{detail.stats.completedOrders}</p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                  </div>

                  {/* Block/Unblock */}
                  <Button
                    variant={detail.customer.isDeleted ? "default" : "destructive"}
                    className="w-full"
                    disabled={actionLoading}
                    onClick={() =>
                      toggleBlock(selected, detail.customer.isDeleted ? "unblock" : "block")
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
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Order history ({detail.orders.length})
                    </h3>
                    <div className="mt-2 space-y-2">
                      {detail.orders.map((o) => (
                        <div key={o.id} className="rounded-lg border p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-medium">{o.orderNumber}</span>
                            <span className="font-semibold">{formatRWF(o.total)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{o.itemCount} items · {o.paymentMethod}</span>
                            <span>{new Date(o.createdAt).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="mt-1 text-xs"
                          >
                            {o.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
