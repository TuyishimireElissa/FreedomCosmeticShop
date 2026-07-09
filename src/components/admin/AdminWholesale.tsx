"use client"

/**
 * AdminWholesale — complete wholesale management for admin dashboard.
 *
 * Section 7: Admin Wholesale Management
 *
 * Internal tabs:
 *   1. Applications — list pending/approved/rejected, review modal (approve/reject)
 *   2. Customers — approved wholesale customers with revenue + credit
 *   3. Orders — wholesale orders with invoice status
 *   4. Credit — credit overview + overdue payments + record payment
 *   5. Analytics — wholesale vs retail revenue, top customers/products
 *
 * Uses /api/admin/wholesale/* endpoints from Section 2.
 */

import { useState, useEffect, useCallback } from "react"
import { formatRWF, formatRWFCompact } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Store,
  Users,
  Package,
  CreditCard,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Search,
  RefreshCw,
} from "lucide-react"

// ============================================================================
// Main component
// ============================================================================

export function AdminWholesale() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Store className="h-5 w-5 text-primary" />
          Wholesale Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage wholesale applications, customers, orders, credit & analytics
        </p>
      </div>

      <Tabs defaultValue="applications">
        <TabsList className="mb-4 grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="applications" className="gap-1 text-xs">
            <Store className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Applications</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1 text-xs">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1 text-xs">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="credit" className="gap-1 text-xs">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Credit</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications"><ApplicationsTab /></TabsContent>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="credit"><CreditTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// 1. Applications Tab
// ============================================================================

interface Application {
  id: string
  businessName: string
  businessType: string
  businessPhone: string
  businessAddress: string
  businessDistrict: string
  tinNumber: string | null
  yearsInBusiness: number | null
  monthlyRevenue: string | null
  nationalId: string | null
  notes: string | null
  status: string
  appliedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  reviewNotes: string | null
  user: { id: string; name: string; phone: string; email: string | null }
}

function ApplicationsTab() {
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("PENDING")
  const [search, setSearch] = useState("")
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Approve form state
  const [creditLimit, setCreditLimit] = useState("500000")
  const [paymentTerms, setPaymentTerms] = useState("30")
  const [specialDiscount, setSpecialDiscount] = useState("0")
  const [approveNotes, setApproveNotes] = useState("")
  const [rejectReason, setRejectReason] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/wholesale/applications?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setApplications(data.applications || [])
      setCounts(data.counts || {})
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [statusFilter, search])

  useEffect(() => { load() }, [load])

  const handleApprove = async () => {
    if (!reviewTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/wholesale/applications/${reviewTarget.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditLimit: Number(creditLimit),
          paymentTerms: Number(paymentTerms),
          specialDiscount: Number(specialDiscount),
          notes: approveNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast({ title: "✅ Application approved", description: `${reviewTarget.businessName} is now a wholesale customer` })
      setReviewTarget(null)
      setApproveNotes("")
      load()
    } catch (e) {
      toast({ title: "Approval failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" })
    } finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    if (!reviewTarget || !rejectReason.trim()) {
      toast({ title: "Reason required", variant: "destructive" })
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/wholesale/applications/${reviewTarget.id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast({ title: "Application rejected", description: reviewTarget.businessName })
      setReviewTarget(null)
      setRejectReason("")
      load()
    } catch (e) {
      toast({ title: "Rejection failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" })
    } finally { setActionLoading(false) }
  }

  return (
    <div>
      {/* Status tabs */}
      <div className="mb-3 flex flex-wrap gap-2">
        {["PENDING", "APPROVED", "REJECTED", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            {counts[s] ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by business name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : applications.length === 0 ? (
        <div className="grid place-items-center py-12 text-center">
          <Store className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">No applications found</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div key={app.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{app.businessName}</p>
                  <Badge variant={app.status === "PENDING" ? "default" : app.status === "APPROVED" ? "secondary" : "destructive"} className="text-[10px]">
                    {app.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {app.businessType.replace(/_/g, " ").toLowerCase()} · {app.businessDistrict} · {app.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Applied: {new Date(app.appliedAt).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}
                  {app.monthlyRevenue && ` · Est: ${app.monthlyRevenue}`}
                </p>
              </div>
              {app.status === "PENDING" && (
                <Button size="sm" onClick={() => { setReviewTarget(app); setCreditLimit("500000"); setPaymentTerms("30"); setSpecialDiscount("0"); }}>
                  Review
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewTarget && (
        <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Application — {reviewTarget.businessName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {/* Business details */}
              <div className="rounded-lg border p-3 text-sm">
                <p><span className="text-muted-foreground">Type:</span> {reviewTarget.businessType.replace(/_/g, " ").toLowerCase()}</p>
                <p><span className="text-muted-foreground">District:</span> {reviewTarget.businessDistrict}</p>
                <p><span className="text-muted-foreground">Address:</span> {reviewTarget.businessAddress}</p>
                <p><span className="text-muted-foreground">Phone:</span> {reviewTarget.businessPhone}</p>
                {reviewTarget.tinNumber && <p><span className="text-muted-foreground">TIN:</span> {reviewTarget.tinNumber}</p>}
                <p><span className="text-muted-foreground">Years:</span> {reviewTarget.yearsInBusiness || "N/A"}</p>
                <p><span className="text-muted-foreground">Monthly:</span> {reviewTarget.monthlyRevenue || "N/A"}</p>
                {reviewTarget.notes && <p className="mt-1 text-muted-foreground">Notes: {reviewTarget.notes}</p>}
              </div>

              {/* Approve fields */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-900">If Approving:</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Credit Limit (RWF)</Label>
                    <Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className="h-8 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Payment Terms (days)</Label>
                    <Input type="number" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="h-8 mt-1" />
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Special Discount (%)</Label>
                  <Input type="number" value={specialDiscount} onChange={(e) => setSpecialDiscount(e.target.value)} className="h-8 mt-1" min="0" max="50" />
                </div>
                <Input placeholder="Notes (optional)" value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} className="h-8 mt-2" />
                <Button className="mt-2 w-full" onClick={handleApprove} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Approve
                </Button>
              </div>

              {/* Reject fields */}
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-900">If Rejecting:</p>
                <Textarea placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} className="mt-2 resize-none" />
                <Button variant="destructive" className="mt-2 w-full" onClick={handleReject} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================================
// 2. Customers Tab
// ============================================================================

interface WholesaleCustomer {
  id: string
  name: string
  phone: string
  email: string | null
  businessName: string | null
  businessType: string | null
  businessPhone: string | null
  businessDistrict: string | null
  tinNumber: string | null
  wholesaleApprovedAt: string | null
  wholesaleDiscount: number
  credit: { limit: number; used: number; available: number } | null
  totalRevenue: number
  orderCount: number
}

function CustomersTab() {
  const [customers, setCustomers] = useState<WholesaleCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/wholesale/customers?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const getTier = (revenue: number) => {
    if (revenue > 1_000_000) return { label: "Diamond 💎", class: "bg-indigo-100 text-indigo-700" }
    if (revenue > 500_000) return { label: "Gold 🥇", class: "bg-amber-100 text-amber-700" }
    if (revenue > 100_000) return { label: "Silver 🥈", class: "bg-slate-100 text-slate-700" }
    return { label: "Bronze 🥉", class: "bg-orange-100 text-orange-700" }
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by business name, owner, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : customers.length === 0 ? (
        <div className="grid place-items-center py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">No wholesale customers</h3>
          <p className="mt-1 text-sm text-muted-foreground">Approve applications to add wholesale customers.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Business</th>
                  <th className="px-3 py-3 text-left font-medium">Owner</th>
                  <th className="px-3 py-3 text-right font-medium">Revenue</th>
                  <th className="px-3 py-3 text-right font-medium">Credit Used</th>
                  <th className="px-3 py-3 text-center font-medium">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((c) => {
                  const tier = getTier(c.totalRevenue)
                  return (
                    <tr key={c.id} className="hover:bg-secondary/20">
                      <td className="px-3 py-3">
                        <p className="font-medium">{c.businessName || c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.businessType?.replace(/_/g, " ").toLowerCase()}</p>
                        <p className="text-xs text-muted-foreground">{c.businessDistrict}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.businessPhone || c.phone}</p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <p className="font-bold">{formatRWFCompact(c.totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">{c.orderCount} orders</p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {c.credit ? (
                          <div>
                            <p className="text-xs font-medium">{formatRWFCompact(c.credit.used)}</p>
                            <p className="text-[10px] text-muted-foreground">/ {formatRWFCompact(c.credit.limit)}</p>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${tier.class}`}>
                          {tier.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 3. Orders Tab
// ============================================================================

function OrdersTab() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/wholesale/orders")
      if (!res.ok) return
      const data = await res.json()
      setOrders(data.orders || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{orders.length} wholesale orders</p>
        <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="grid place-items-center py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">No wholesale orders</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Order #</th>
                  <th className="px-3 py-3 text-left font-medium">Customer</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                  <th className="px-3 py-3 text-center font-medium">Invoice</th>
                  <th className="px-3 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o, i) => {
                  const order = o as { id: string; orderNumber: string; customerName: string; total: number; status: string; isCredit: boolean; createdAt: string; wholesaleInvoice: { invoiceNumber: string; isPaid: boolean; dueDate: string | null } | null; payments: Array<{ method: string; status: string }> }
                  return (
                    <tr key={order.id || i} className="hover:bg-secondary/20">
                      <td className="px-3 py-3">
                        <p className="font-mono text-xs font-bold">{order.orderNumber}</p>
                        {order.isCredit && <Badge variant="secondary" className="text-[10px]">💳 Credit</Badge>}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-medium">{order.customerName}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{formatRWF(order.total)}</td>
                      <td className="px-3 py-3 text-center">
                        {order.wholesaleInvoice ? (
                          <div>
                            <p className="font-mono text-[10px]">{order.wholesaleInvoice.invoiceNumber}</p>
                            <span className={`text-[10px] font-medium ${order.wholesaleInvoice.isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                              {order.wholesaleInvoice.isPaid ? "PAID" : "DUE"}
                            </span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          order.status === "DELIVERED" ? "bg-emerald-100 text-emerald-700" :
                          order.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{order.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 4. Credit Tab
// ============================================================================

function CreditTab() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<WholesaleCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentTarget, setPaymentTarget] = useState<WholesaleCustomer | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/wholesale/customers")
      if (!res.ok) return
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalLimit = customers.reduce((s, c) => s + (c.credit?.limit || 0), 0)
  const totalUsed = customers.reduce((s, c) => s + (c.credit?.used || 0), 0)
  const totalAvailable = totalLimit - totalUsed

  const handlePayment = async () => {
    if (!paymentTarget || !paymentAmount) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/admin/wholesale/credit-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: paymentTarget.id, amount: Number(paymentAmount) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast({ title: "✅ Payment recorded", description: `${formatRWF(Number(paymentAmount))} from ${paymentTarget.businessName || paymentTarget.name}` })
      setPaymentTarget(null)
      setPaymentAmount("")
      load()
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" })
    } finally { setActionLoading(false) }
  }

  return (
    <div>
      {/* Overview */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <CreditCard className="h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold">{formatRWFCompact(totalLimit)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Credit Given</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="mt-1 text-lg font-bold text-amber-600">{formatRWFCompact(totalUsed)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Currently Used</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className="mt-1 text-lg font-bold text-emerald-600">{formatRWFCompact(totalAvailable)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Available</p>
        </div>
      </div>

      {/* Customers with credit */}
      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {customers.filter((c) => c.credit && c.credit.used > 0).length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              No outstanding credit balances. All wholesale customers are paid up. ✅
            </p>
          ) : (
            customers.filter((c) => c.credit && c.credit.used > 0).map((c) => {
              const pct = c.credit!.limit > 0 ? Math.round((c.credit!.used / c.credit!.limit) * 100) : 0
              return (
                <div key={c.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{c.businessName || c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.businessPhone || c.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatRWF(c.credit!.used)}</p>
                      <p className="text-[10px] text-muted-foreground">of {formatRWF(c.credit!.limit)}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-violet-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-amber-600 hover:bg-amber-50"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/admin/wholesale/send-reminder", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: c.id, type: "due" }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error)
                          toast({ title: "📩 Due reminder sent", description: c.businessName || c.name })
                        } catch {
                          toast({ title: "Failed to send reminder", variant: "destructive" })
                        }
                      }}
                    >
                      📩 Send Reminder
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setPaymentTarget(c); setPaymentAmount(String(c.credit!.used)) }}>
                      <CreditCard className="mr-1.5 h-3 w-3" /> Record Payment
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Payment modal */}
      {paymentTarget && (
        <Dialog open={!!paymentTarget} onOpenChange={(o) => !o && setPaymentTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Record Credit Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/20 p-3 text-sm">
                <p className="font-medium">{paymentTarget.businessName || paymentTarget.name}</p>
                <p className="text-xs text-muted-foreground">Outstanding: {formatRWF(paymentTarget.credit?.used || 0)}</p>
              </div>
              <div>
                <Label>Payment Amount (RWF)</Label>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="mt-1" />
              </div>
              <Button className="w-full" onClick={handlePayment} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================================
// 5. Analytics Tab
// ============================================================================

interface AnalyticsData {
  thisMonth: {
    wholesaleRevenue: number
    retailRevenue: number
    wholesalePct: number
    wholesaleOrders: number
    retailOrders: number
    avgWholesaleOrder: number
  }
  topCustomers: Array<{ userId: string; businessName: string; revenue: number; orderCount: number }>
  topProducts: Array<{ productId: string; name: string; totalSold: number; orderCount: number }>
  credit: { totalLimit: number; totalUsed: number; totalAvailable: number }
  businessTypes: Array<{ type: string; count: number }>
}

function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/wholesale/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton className="h-96 rounded-2xl" />
  if (!data) return <p className="text-sm text-muted-foreground">Failed to load analytics.</p>

  const totalRevenue = data.thisMonth.wholesaleRevenue + data.thisMonth.retailRevenue

  return (
    <div className="space-y-4">
      {/* Revenue comparison */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          <p className="mt-1 text-lg font-bold text-violet-600">{formatRWFCompact(data.thisMonth.wholesaleRevenue)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">WHL Revenue (Month)</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold">{formatRWFCompact(data.thisMonth.retailRevenue)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Retail Revenue (Month)</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Package className="h-4 w-4 text-sky-500" />
          <p className="mt-1 text-lg font-bold">{formatRWFCompact(data.thisMonth.avgWholesaleOrder)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg WHL Order</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <BarChart3 className="h-4 w-4 text-amber-500" />
          <p className="mt-1 text-lg font-bold">{data.thisMonth.wholesalePct}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">% Wholesale</p>
        </div>
      </div>

      {/* Revenue split bar */}
      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue Split This Month</p>
        {totalRevenue > 0 ? (
          <div className="flex h-6 w-full overflow-hidden rounded-full">
            <div className="bg-violet-500" style={{ width: `${data.thisMonth.wholesalePct}%` }} title={`Wholesale: ${formatRWF(data.thisMonth.wholesaleRevenue)}`} />
            <div className="bg-primary" style={{ width: `${100 - data.thisMonth.wholesalePct}%` }} title={`Retail: ${formatRWF(data.thisMonth.retailRevenue)}`} />
          </div>
        ) : <p className="text-xs text-muted-foreground">No revenue this month.</p>}
        <div className="mt-2 flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Wholesale ({data.thisMonth.wholesaleOrders} orders)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Retail ({data.thisMonth.retailOrders} orders)</span>
        </div>
      </div>

      {/* Top customers */}
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Top Wholesale Customers</h3>
        {data.topCustomers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No wholesale orders yet.</p>
        ) : (
          <div className="space-y-1">
            {data.topCustomers.map((c, i) => (
              <div key={c.userId} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
                  {c.businessName}
                </span>
                <div className="text-right">
                  <p className="font-bold">{formatRWFCompact(c.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{c.orderCount} orders</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top products */}
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Most Ordered Wholesale Products</h3>
        {data.topProducts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No wholesale product sales yet.</p>
        ) : (
          <div className="space-y-1">
            {data.topProducts.map((p, i) => (
              <div key={p.productId} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
                  {p.name}
                </span>
                <div className="text-right">
                  <p className="font-bold">{p.totalSold} units</p>
                  <p className="text-[10px] text-muted-foreground">{p.orderCount} orders</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Credit Limit</p>
          <p className="text-sm font-bold">{formatRWFCompact(data.credit.totalLimit)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Used</p>
          <p className="text-sm font-bold text-amber-600">{formatRWFCompact(data.credit.totalUsed)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Available</p>
          <p className="text-sm font-bold text-emerald-600">{formatRWFCompact(data.credit.totalAvailable)}</p>
        </div>
      </div>

      {/* Business types */}
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Customers by Business Type</h3>
        <div className="flex flex-wrap gap-2">
          {data.businessTypes.map((bt) => (
            <span key={bt.type} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {bt.type.replace(/_/g, " ").toLowerCase()}: {bt.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
