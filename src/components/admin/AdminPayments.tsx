"use client"

/**
 * AdminPayments — payments management dashboard.
 *
 * Features:
 *   - Stats row: Total revenue, MTN MoMo, Airtel, Card, COD
 *   - Failed payments alert
 *   - Transactions table (TXN ID, date, customer, order#, amount, method, status, actions)
 *   - Refund button (calls /api/payments/refund)
 *
 * Fetches data from /api/admin/analytics for stats + /api/orders for transactions.
 */

import { useEffect, useState, useCallback } from "react"
import { formatRWF, PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CreditCard,
  Smartphone,
  Banknote,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Transaction {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  method: string
  amount: number
  status: string
  providerTransactionId: string | null
  phoneNumber: string | null
  cardLast4: string | null
  cardBrand: string | null
  failureReason: string | null
  initiatedAt: string
  completedAt: string | null
}

interface PaymentStats {
  totalRevenue: number
  mtnCount: number
  mtnAmount: number
  airtelCount: number
  airtelAmount: number
  cardCount: number
  cardAmount: number
  codCount: number
  codAmount: number
  failedCount: number
  failedAmount: number
}

const METHOD_ICONS: Record<string, React.ElementType> = {
  MTN_MOMO: Smartphone,
  AIRTEL_MONEY: Smartphone,
  CARD: CreditCard,
  COD: Banknote,
  BANK_TRANSFER: CreditCard,
}

const METHOD_COLORS: Record<string, string> = {
  MTN_MOMO: "text-yellow-600",
  AIRTEL_MONEY: "text-red-600",
  CARD: "text-gray-700",
  COD: "text-emerald-600",
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-purple-100 text-purple-700",
}

export function AdminPayments() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)
  const [refunding, setRefunding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch orders with payments
      const res = await fetch("/api/orders?pageSize=100")
      if (!res.ok) return
      const data = await res.json()

      // Extract all payments from orders
      const txns: Transaction[] = []
      let totalRevenue = 0
      let mtnCount = 0, mtnAmount = 0
      let airtelCount = 0, airtelAmount = 0
      let cardCount = 0, cardAmount = 0
      let codCount = 0, codAmount = 0
      let failedCount = 0, failedAmount = 0

      for (const order of data.orders || []) {
        for (const payment of order.payments || []) {
          txns.push({
            id: payment.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            method: payment.method,
            amount: payment.amount,
            status: payment.status,
            providerTransactionId: payment.providerTransactionId,
            phoneNumber: payment.phoneNumber,
            cardLast4: payment.cardLast4,
            cardBrand: payment.cardBrand,
            failureReason: payment.failureReason,
            initiatedAt: payment.initiatedAt,
            completedAt: payment.completedAt,
          })

          if (payment.status === "PAID") {
            totalRevenue += payment.amount
            if (payment.method === "MTN_MOMO") { mtnCount++; mtnAmount += payment.amount }
            else if (payment.method === "AIRTEL_MONEY") { airtelCount++; airtelAmount += payment.amount }
            else if (payment.method === "CARD") { cardCount++; cardAmount += payment.amount }
            else if (payment.method === "COD") { codCount++; codAmount += payment.amount }
          }
          if (payment.status === "FAILED") {
            failedCount++
            failedAmount += payment.amount
          }
        }
      }

      // Sort by date desc
      txns.sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime())
      setTransactions(txns)
      setStats({
        totalRevenue, mtnCount, mtnAmount, airtelCount, airtelAmount,
        cardCount, cardAmount, codCount, codAmount, failedCount, failedAmount,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRefund = async () => {
    if (!refundTarget) return
    setRefunding(true)
    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: refundTarget.orderId,
          reason: "Admin initiated refund",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Refund failed")

      toast({
        title: "Refund initiated",
        description: `${formatRWF(refundTarget.amount)} → ${refundTarget.customerPhone}`,
      })
      setRefundTarget(null)
      load()
    } catch (e) {
      toast({
        title: "Refund failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setRefunding(false)
    }
  }

  // Filter transactions
  const filtered = transactions.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.orderNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.includes(q) ||
        (t.providerTransactionId || "").toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">Payments</h2>
        <p className="text-sm text-muted-foreground">
          {transactions.length} transactions · {formatRWF(stats.totalRevenue)} total revenue
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</p>
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-lg font-bold">{formatRWF(stats.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">All methods</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-yellow-600">MTN MoMo</p>
            <Smartphone className="h-4 w-4 text-yellow-600" />
          </div>
          <p className="mt-2 text-lg font-bold">{formatRWF(stats.mtnAmount)}</p>
          <p className="text-xs text-muted-foreground">{stats.mtnCount} transactions</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-red-600">Airtel</p>
            <Smartphone className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-2 text-lg font-bold">{formatRWF(stats.airtelAmount)}</p>
          <p className="text-xs text-muted-foreground">{stats.airtelCount} transactions</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-700">Card</p>
            <CreditCard className="h-4 w-4 text-gray-700" />
          </div>
          <p className="mt-2 text-lg font-bold">{formatRWF(stats.cardAmount)}</p>
          <p className="text-xs text-muted-foreground">{stats.cardCount} transactions</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">COD</p>
            <Banknote className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-lg font-bold">{formatRWF(stats.codAmount)}</p>
          <p className="text-xs text-muted-foreground">{stats.codCount} transactions</p>
        </div>
      </div>

      {/* Failed payments alert */}
      {stats.failedCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                {stats.failedCount} Failed Payments Need Attention
              </p>
              <p className="text-xs text-red-700">
                Total: {formatRWF(stats.failedAmount)} unrecovered
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-100"
            onClick={() => setStatusFilter("FAILED")}
          >
            View Failed
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order#, customer, phone, or TXN ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PAID">✅ Paid</SelectItem>
            <SelectItem value="PENDING">⏳ Pending</SelectItem>
            <SelectItem value="FAILED">❌ Failed</SelectItem>
            <SelectItem value="REFUNDED">🔄 Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Transactions table */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {filtered.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 font-semibold">No transactions found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter !== "all" ? `No ${statusFilter.toLowerCase()} payments.` : "Transactions will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">TXN ID</th>
                  <th className="px-3 py-3 text-left font-medium">Date</th>
                  <th className="px-3 py-3 text-left font-medium">Customer</th>
                  <th className="px-3 py-3 text-left font-medium">Order #</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                  <th className="px-3 py-3 text-left font-medium">Method</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.slice(0, 50).map((t) => {
                  const Icon = METHOD_ICONS[t.method] || CreditCard
                  const color = METHOD_COLORS[t.method] || "text-gray-600"
                  return (
                    <tr key={t.id} className="hover:bg-secondary/20">
                      <td className="px-3 py-3 font-mono text-xs">
                        {t.providerTransactionId ? t.providerTransactionId.slice(0, 12) + "…" : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {new Date(t.initiatedAt).toLocaleDateString("en-RW", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{t.customerName}</p>
                        <p className="text-xs text-muted-foreground">{t.customerPhone}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-medium">
                        {t.orderNumber}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatRWF(t.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`flex items-center gap-1.5 text-xs ${color}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {PAYMENT_METHODS[t.method as PaymentMethodKey]?.label || t.method}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] || ""}`}>
                          {t.status === "PAID" ? "✅ " : t.status === "FAILED" ? "❌ " : t.status === "REFUNDED" ? "🔄 " : "⏳ "}
                          {t.status}
                        </span>
                        {t.failureReason && (
                          <p className="mt-0.5 text-[10px] text-red-500">{t.failureReason}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          {t.status === "PAID" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-purple-600 hover:bg-purple-50"
                              onClick={() => setRefundTarget(t)}
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund confirmation */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={() => setRefundTarget(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold">Process Refund</h3>
            </div>
            <div className="mb-4 space-y-2 rounded-lg bg-secondary/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order</span>
                <span className="font-mono font-medium">{refundTarget.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{refundTarget.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold">{formatRWF(refundTarget.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">
                  {PAYMENT_METHODS[refundTarget.method as PaymentMethodKey]?.label || refundTarget.method}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund to</span>
                <span className="font-medium">{refundTarget.phoneNumber || "Original method"}</span>
              </div>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              The refund will be sent to the customer&apos;s original payment method. An SMS will be sent to notify them. The order will be marked as CANCELLED.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRefundTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
                onClick={handleRefund}
                disabled={refunding}
              >
                {refunding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Confirm Refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
