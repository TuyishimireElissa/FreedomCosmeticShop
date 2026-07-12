"use client"

/**
 * AdminView — full admin dashboard with 7 tabs.
 *
 * Tabs:
 *   1. Overview    — revenue, charts, recent orders, top products
 *   2. Orders      — order management (existing, enhanced)
 *   3. Products    — product CRUD (existing AdminProductManager)
 *   4. Customers   — customer list, analytics, block/unblock
 *   5. Deliveries  — assign riders, track, performance
 *   6. Analytics   — charts, date range, export to CSV
 *   7. Settings    — coupons, banners, delivery fees
 *
 * Features:
 *   - Real-time new order notifications (sound + toast)
 *   - Notification bell with unread count
 *   - Responsive tab layout
 */

import { useEffect, useState, useCallback, useRef } from "react"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/store/useStore"
import { useAdminNotifications } from "@/hooks/useAdminNotifications"
import { AdminLoginScreen } from "./AdminLoginScreen"
import { AdminOverview } from "./AdminOverview"
import { AdminProductManager } from "./AdminProductManager"
import { AdminCustomers } from "./AdminCustomers"
import { AdminDeliveries } from "./AdminDeliveries"
import { AdminAnalytics } from "./AdminAnalytics"
import { AdminSettings } from "./AdminSettings"
import { RealTimeNotifications } from "./RealTimeNotifications"
import { InvoicePrinter } from "./InvoicePrinter"
import { AdminSmsManager } from "./AdminSmsManager"
import { AdminPayments } from "./AdminPayments"
import { AdminMarketing } from "./AdminMarketing"
import { AdminReports } from "./AdminReports"
import { AdminStaff } from "./AdminStaff"
import { AdminMobilePanel } from "./AdminMobilePanel"
import { AdminWholesale } from "./AdminWholesale"
import {
  Shield,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings as SettingsIcon,
  LayoutDashboard,
  Bell,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  ShoppingCart,
  Clock,
  TrendingUp,
  ChevronDown,
  LogOut,
  MessageCircle,
  CreditCard,
  RotateCcw,
  Megaphone,
  FileText,
  Sun,
  Moon,
  Keyboard,
  Smartphone,
  Store,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { useOrderUpdates } from "@/hooks/use-realtime"
import { useLiveStats } from "@/hooks/use-live-stats"
import { useSettings } from "@/hooks/use-settings"
import { formatRWFCompact } from "@/lib/format"
import { type AdminTab, useOptionalAdminShell } from "./AdminShellContext"

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

export function AdminView({ embedded = false }: { embedded?: boolean } = {}) {
  const { goHome, user } = useStore()
  const { toast } = useToast()
  const adminShell = useOptionalAdminShell()
  const [localActiveTab, setLocalActiveTab] = useState("overview")
  const activeTab = embedded && adminShell ? adminShell.activeTab : localActiveTab
  const setActiveTab = useCallback((tab: string) => {
    if (embedded && adminShell) adminShell.setActiveTab(tab as AdminTab)
    else setLocalActiveTab(tab)
  }, [adminShell, embedded])

  // Dynamic store settings (logo, name, etc.)
  const { settings: adminSettings } = useSettings()

  // Section 12: Mobile admin mini-panel toggle
  const [mobileMode, setMobileMode] = useState(false)

  // Section 12: theme + keyboard shortcuts
  const { theme, toggleTheme, mounted } = useTheme()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas (except for the ? key with no modifier)
      const target = e.target as HTMLElement
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable

      // Alt+1..9 → switch tabs
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const tabOrder = [
          "overview", "orders", "products", "customers", "deliveries",
          "analytics", "reports", "settings", "staff", "sms", "payments", "marketing",
        ]
        const idx = Number(e.key) - 1
        if (idx < tabOrder.length) {
          setActiveTab(tabOrder[idx])
        }
        return
      }

      // Alt+T → toggle theme
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "t") {
        e.preventDefault()
        toggleTheme()
        return
      }

      // Alt+K → focus search
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      // Alt+/ → show shortcuts help
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === "/") {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      // Alt+P → print (only works if reports tab is active)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "p") {
        e.preventDefault()
        window.print()
        return
      }

      // ? (with no modifier) → show shortcuts help (only when not typing)
      if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key === "?" && !isTyping) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      // Escape → close shortcuts modal
      if (e.key === "Escape" && shortcutsOpen) {
        setShortcutsOpen(false)
        return
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggleTheme, shortcutsOpen, setActiveTab])

  // Real-time notifications
  const { notifications, enabled, setEnabled, dismiss, clearAll } = useAdminNotifications()

  // ─── Section 10: Live stats (revenue ticker + visitor count) ──────
  const liveStats = useLiveStats()

  // ─── Orders state ─────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // ─── Bulk update state ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>("")

  const loadOrders = useCallback(async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/orders?${params.toString()}`)
      const data = await res.json()
      let list: Order[] = data.orders || []
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
      setOrdersLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    if (activeTab === "orders") loadOrders()
  }, [loadOrders, activeTab])

  // ─── Section 3: Real-time order updates (admin side) ──────────────
  // When a new order comes in, play a sound + refresh the orders list +
  // show a toast. When an order status changes (from another admin or
  // system), refresh the list to reflect the change.
  useOrderUpdates((event, data) => {
    const o = data as { id: string; orderNumber: string; status: string; total: number; customerName?: string }

    if (event === "order:new") {
      // Play alert sound for new orders
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioContextClass) {
          const ctx = new AudioContextClass()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 880
          osc.type = "sine"
          gain.gain.setValueAtTime(0.2, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 0.5)
        }
      } catch {
        // Audio not supported
      }

      // Show toast notification
      toast({
        title: "🔔 New order received!",
        description: `${o.orderNumber} — ${o.customerName || "Customer"} — ${formatRWF(o.total)}`,
      })

      // Refresh the orders list if on the orders tab
      if (activeTab === "orders") {
        loadOrders()
      }
    } else if (event.startsWith("order:") && event !== "order:new") {
      // Order status changed — update in-place if in the list
      setOrders((prev) =>
        prev.map((item) =>
          item.id === o.id || item.orderNumber === o.orderNumber
            ? { ...item, status: o.status }
            : item
        )
      )

      // If the detail drawer is open for this order, update it too
      if (selectedOrder && (selectedOrder.id === o.id || selectedOrder.orderNumber === o.orderNumber)) {
        setSelectedOrder({ ...selectedOrder, status: o.status })
      }
    }
  })

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
      toast({ title: "Order updated", description: `${updated.orderNumber} → ${value}` })
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  // ─── Bulk status update ───────────────────────────────────────────
  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0 || !bulkStatus) return
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: bulkStatus }),
        })
      )
      await Promise.all(promises)
      toast({
        title: "Bulk update complete",
        description: `${selectedIds.size} orders → ${bulkStatus}`,
      })
      setSelectedIds(new Set())
      setBulkStatus("")
      loadOrders()
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" })
    }
  }

  // ─── Reseed ──────────────────────────────────────────────────────
  const handleReseed = async () => {
    if (!window.confirm("Reset catalog to demo data? Orders will be preserved.")) return
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      if (!res.ok) throw new Error("Seed failed")
      toast({ title: "Database re-seeded" })
    } catch (e) {
      toast({
        title: "Seed failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    revenue: orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.total, 0),
  }

  // ─── ACCESS GATE ─────────────────────────────────────────────────
  // If user is not logged in → show admin login screen
  // If user is logged in but not admin → show access denied
  // If user is admin → show the dashboard (existing code below)

  const { authLoading } = useStore()

  // Kigali real-time clock
  useEffect(() => {
    const updateClock = () => {
      const clock = document.getElementById("admin-clock")
      if (clock) {
        clock.textContent = new Date().toLocaleTimeString("en-RW", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Kigali",
        })
      }
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Shield className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  if (!user) {
    return <AdminLoginScreen onBack={goHome} />
  }

  if (user.role !== "ADMIN" && user.role !== "STAFF" && user.role !== "MANAGER") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-red-900">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to access the admin panel.
            <br />
            Admin access only.
          </p>
          <Button variant="outline" className="mt-6" onClick={goHome}>
            Back to store
          </Button>
        </div>
      </div>
    )
  }

  // ─── ADMIN DASHBOARD (existing code) ──────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Enhanced Admin Header ─────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        {/* Top row: logo + search + profile */}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          {/* Logo + title — Section 3: Dynamic logo */}
          <div className="flex shrink-0 items-center gap-2">
            {adminSettings?.logoUrl ? (
              <img src={adminSettings.logoUrl} alt="FreedomCosmeticShop" className="max-h-9 max-w-[120px] object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </span>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight">FreedomCosmeticShop</p>
              <p className="text-[10px] text-muted-foreground">Admin Panel</p>
            </div>
          </div>

          {/* Global search */}
          <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search orders, products, customers... (Alt+K)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-full pl-9 pr-3"
            />
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            {/* Section 12: Dark-mode toggle */}
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  toggleTheme()
                  toast({
                    title: `Switched to ${theme === "dark" ? "light" : "dark"} mode`,
                  })
                }}
                title="Toggle theme (Alt+T)"
                className="h-9 w-9"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Section 12: Keyboard shortcuts help */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard shortcuts (Alt+/)"
              className="h-9 w-9"
            >
              <Keyboard className="h-4 w-4" />
            </Button>

            {/* Section 12: Mobile admin mini-panel toggle */}
            <Button
              variant={mobileMode ? "default" : "outline"}
              size="icon"
              onClick={() => setMobileMode(!mobileMode)}
              title="Mobile admin mini-panel"
              className="h-9 w-9"
            >
              <Smartphone className="h-4 w-4" />
            </Button>

            {/* Section 10: Live revenue ticker */}
            <div className="hidden items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs lg:flex dark:bg-emerald-950">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-muted-foreground">Today:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formatRWFCompact(liveStats.todayRevenue)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium text-emerald-600">{liveStats.todayOrderCount} orders</span>
            </div>

            {/* Section 10: Live visitor count */}
            <div className="hidden items-center gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs lg:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-mono font-medium">{liveStats.activeVisitors}</span>
              <span className="text-muted-foreground">live</span>
            </div>

            {/* Kigali clock */}
            <div className="hidden items-center gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs lg:flex">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono font-medium" id="admin-clock">--:--</span>
              <span className="text-muted-foreground">KGL</span>
            </div>

            {/* Notifications bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEnabled(!enabled)}
                      className="text-xs text-primary hover:underline"
                    >
                      {enabled ? "Pause" : "Resume"}
                    </button>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">
                        Clear
                      </button>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-1 py-2"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={() => dismiss(n.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Real-time notifications */}
            <RealTimeNotifications />

            {/* Reset button */}
            <Button variant="outline" size="sm" onClick={handleReseed} className="hidden sm:inline-flex">
              <Trash2 className="mr-1.5 h-4 w-4" /> Reset
            </Button>

            {/* Admin profile dropdown — NEW */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase() || "A"}
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">{user?.name?.split(" ")[0] || "Admin"}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "A"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {user?.role} · Online
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                  <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("analytics")}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
                    useStore.getState().logout()
                    goHome()
                  }}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ─── Section 12: Mobile admin mini-panel ─────────────────────── */}
      {mobileMode ? (
        <AdminMobilePanel />
      ) : (
        <>
      {/* ─── Main content ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome message */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admin dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.name ? `Welcome back, ${user.name}` : "Manage your store"} · {new Date().toLocaleDateString("en-RW", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {!embedded && (
      <TabsList className="mb-6 grid w-full grid-cols-4 sm:grid-cols-13">
          <TabsTrigger value="overview" className="gap-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1">
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-1">
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          {/* NEW: Reports tab (print-ready performance report) */}
          <TabsTrigger value="reports" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          {/* NEW: Staff & Security tab */}
          <TabsTrigger value="staff" className="gap-1">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1">
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SMS</span>
          </TabsTrigger>
          {/* NEW: Payments tab */}
          <TabsTrigger value="payments" className="gap-1">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          {/* NEW: Marketing tab */}
          <TabsTrigger value="marketing" className="gap-1">
            <Megaphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Marketing</span>
          </TabsTrigger>
          {/* NEW: Wholesale tab */}
          <TabsTrigger value="wholesale" className="gap-1">
            <Store className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Wholesale</span>
          </TabsTrigger>
        </TabsList>
      )}

        {/* Overview */}
        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders">
          {/* Quick stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total orders", value: orderStats.total, icon: Package },
              { label: "Pending", value: orderStats.pending, icon: Clock },
              { label: "Delivered", value: orderStats.delivered, icon: CheckCircle2 },
              { label: "Revenue", value: formatRWF(orderStats.revenue), icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters + bulk update */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <form className="relative min-w-[200px] flex-1" onSubmit={(e) => e.preventDefault()}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order #, name, or phone..."
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
            <Button variant="outline" size="icon" onClick={loadOrders} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Bulk update bar */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-primary/10 p-3">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue placeholder="Set status..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(STATUS_NEXT).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkUpdate} disabled={!bulkStatus}>
                Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* Orders table */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            {ordersLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="grid place-items-center py-16 text-center">
                <Package className="h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-3 font-semibold">No orders found</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === orders.length && orders.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(orders.map((o) => o.id)))
                            } else {
                              setSelectedIds(new Set())
                            }
                          }}
                          className="h-4 w-4 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Order #</th>
                      <th className="px-4 py-3 text-left font-medium">Customer</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 text-left font-medium">Payment</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        className={`hover:bg-secondary/20 ${
                          o.status === "PENDING" ? "bg-amber-50/50" :
                          o.status === "CONFIRMED" ? "bg-blue-50/30" :
                          o.status === "SHIPPED" ? "bg-orange-50/30" :
                          o.status === "DELIVERED" ? "bg-emerald-50/30" :
                          o.status === "CANCELLED" ? "bg-red-50/30" :
                          ""
                        }`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(o.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds)
                              if (e.target.checked) next.add(o.id)
                              else next.delete(o.id)
                              setSelectedIds(next)
                            }}
                            className="h-4 w-4 rounded"
                          />
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3 font-mono text-xs font-medium"
                          onClick={() => handleRowClick(o)}
                        >
                          {o.orderNumber}
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3"
                          onClick={() => handleRowClick(o)}
                        >
                          <p className="font-medium">{o.customerName}</p>
                          <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleDateString("en-RW", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3 text-right font-medium"
                          onClick={() => handleRowClick(o)}
                        >
                          {formatRWF(o.total)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {PAYMENT_METHODS[o.paymentMethod as PaymentMethodKey]?.label || o.paymentMethod}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || ""}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {/* NEW: Quick confirm for pending orders */}
                            {o.status === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateOrderStatus(o.id, "status", "CONFIRMED")
                                }}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Confirm
                              </Button>
                            )}
                            {/* View button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleRowClick(o)}
                            >
                              View
                            </Button>
                            <InvoicePrinter order={o} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Products */}
        <TabsContent value="products">
          <AdminProductManager />
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <AdminCustomers />
        </TabsContent>

        {/* Deliveries */}
        <TabsContent value="deliveries">
          <AdminDeliveries />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        {/* NEW: Reports — print-ready performance report */}
        <TabsContent value="reports">
          <AdminReports />
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>

        {/* NEW: Staff & Security */}
        <TabsContent value="staff">
          <AdminStaff />
        </TabsContent>

        {/* SMS */}
        <TabsContent value="sms">
          <AdminSmsManager />
        </TabsContent>

        {/* NEW: Payments tab */}
        <TabsContent value="payments">
          <AdminPayments />
        </TabsContent>

        {/* NEW: Marketing tab */}
        <TabsContent value="marketing">
          <AdminMarketing />
        </TabsContent>

        {/* NEW: Wholesale tab */}
        <TabsContent value="wholesale">
          <AdminWholesale />
        </TabsContent>
      </Tabs>

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
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</h3>
                  <p className="mt-1 font-medium">{selectedOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery address</h3>
                  <p className="mt-1 text-sm">
                    {selectedOrder.address}
                    <br />
                    {selectedOrder.city}
                    {selectedOrder.district ? `, ${selectedOrder.district}` : ""}
                    <br />
                    {selectedOrder.province}
                  </p>
                  {selectedOrder.notes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{selectedOrder.notes}&rdquo;</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Items ({selectedOrder.items.length})
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id} className="flex gap-2 text-sm">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                          {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium leading-snug">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRWF(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{formatRWF(item.price * item.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 rounded-lg bg-secondary/30 p-3 text-sm">
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

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Order status
                    </label>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(v) => updateOrderStatus(selectedOrder.id, "status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(STATUS_NEXT).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
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
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment status
                    </label>
                    {/* NEW: Payment info block */}
                    <div className="mb-2 rounded-lg bg-secondary/30 p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-medium">
                          {PAYMENT_METHODS[selectedOrder.paymentMethod as PaymentMethodKey]?.label || selectedOrder.paymentMethod}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">{formatRWF(selectedOrder.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-medium ${
                          selectedOrder.paymentStatus === "PAID" ? "text-emerald-600" :
                          selectedOrder.paymentStatus === "FAILED" ? "text-red-600" :
                          "text-amber-600"
                        }`}>
                          {selectedOrder.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <Select
                      value={selectedOrder.paymentStatus}
                      onValueChange={(v) => updateOrderStatus(selectedOrder.id, "paymentStatus", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <InvoicePrinter order={selectedOrder} />

                {/* NEW: Issue Refund button (only for PAID orders) */}
                {selectedOrder.paymentStatus === "PAID" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/payments/refund", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            orderId: selectedOrder.id,
                            reason: "Admin initiated refund from order detail",
                          }),
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || "Refund failed")
                        toast({
                          title: "Refund initiated",
                          description: `${formatRWF(selectedOrder.total)} → ${selectedOrder.customerPhone}`,
                        })
                        loadOrders()
                        setDetailOpen(false)
                      } catch (e) {
                        toast({
                          title: "Refund failed",
                          description: e instanceof Error ? e.message : "Unknown error",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Issue Refund ({formatRWF(selectedOrder.total)})
                  </Button>
                )}

                {/* NEW: Communication + Delivery actions */}
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {/* Send SMS to customer */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await fetch("/api/sms/send", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              to: selectedOrder.customerPhone,
                              message: `Hello ${selectedOrder.customerName}, your order ${selectedOrder.orderNumber} status is: ${selectedOrder.status}. Total: ${formatRWF(selectedOrder.total)}. FreedomCosmeticShop`,
                            }),
                          })
                          toast({ title: "SMS sent", description: `To ${selectedOrder.customerPhone}` })
                        } catch {
                          toast({ title: "SMS failed", variant: "destructive" })
                        }
                      }}
                    >
                      <Bell className="mr-1.5 h-3.5 w-3.5" /> Send SMS
                    </Button>

                    {/* WhatsApp customer */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const phone = selectedOrder.customerPhone.replace(/[\s+]/g, "")
                        const msg = `Hello ${selectedOrder.customerName}, regarding your order ${selectedOrder.orderNumber} (${formatRWF(selectedOrder.total)})`
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank")
                      }}
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                    </Button>

                    {/* Assign to deliveries tab */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailOpen(false)
                        setActiveTab("deliveries")
                        toast({ title: "Go to Deliveries", description: "Assign a rider for this order" })
                      }}
                    >
                      <Truck className="mr-1.5 h-3.5 w-3.5" /> Assign Rider
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      </div>
        </>
      )}

      {/* Section 12: Keyboard shortcuts modal */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Keyboard className="h-5 w-5 text-primary" />
                Keyboard shortcuts
              </h3>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Navigation
                </p>
                <div className="space-y-1">
                  <ShortcutRow keys={["Alt", "1"]} description="Overview tab" />
                  <ShortcutRow keys={["Alt", "2"]} description="Orders tab" />
                  <ShortcutRow keys={["Alt", "3"]} description="Products tab" />
                  <ShortcutRow keys={["Alt", "4"]} description="Customers tab" />
                  <ShortcutRow keys={["Alt", "5"]} description="Deliveries tab" />
                  <ShortcutRow keys={["Alt", "6"]} description="Analytics tab" />
                  <ShortcutRow keys={["Alt", "7"]} description="Reports tab" />
                  <ShortcutRow keys={["Alt", "8"]} description="Settings tab" />
                  <ShortcutRow keys={["Alt", "9"]} description="Staff & Security tab" />
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </p>
                <div className="space-y-1">
                  <ShortcutRow keys={["Alt", "T"]} description="Toggle dark / light theme" />
                  <ShortcutRow keys={["Alt", "K"]} description="Focus global search" />
                  <ShortcutRow keys={["Alt", "P"]} description="Print current view" />
                  <ShortcutRow keys={["Alt", "/"]} description="Show this shortcuts help" />
                  <ShortcutRow keys={["?"]} description="Show this shortcuts help" />
                  <ShortcutRow keys={["Esc"]} description="Close dialogs" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              Shortcuts are disabled while typing in input fields.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Section 12: Shortcut row sub-component
function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{description}</span>
      <div className="flex gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
            <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold">
              {k}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  )
}
