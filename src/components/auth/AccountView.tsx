"use client"

/**
 * AccountView — shows the logged-in user's info + logout button.
 *
 * In a future phase, this will include:
 *   - Order history
 *   - Saved addresses
 *   - Wishlist
 *   - Loyalty points
 *   - Profile editing
 */

import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useUserEvents } from "@/hooks/use-realtime"
import {
  Sparkles,
  Phone,
  Mail,
  LogOut,
  ShoppingBag,
  MapPin,
  Heart,
  Gift,
  ChevronRight,
  Store,
  Clock,
} from "lucide-react"

export function AccountView() {
  const { user, logout, goHome, goCatalog, fetchUser } = useStore()
  const { toast } = useToast()

  // ─── Section 5/9: Real-time loyalty, order, and account updates ───
  // When admin awards/redeems points, updates the customer's order, or
  // blocks/unblocks the account, react instantly.
  useUserEvents(user?.id, (event, data) => {
    if (event.startsWith(`user:${user?.id}:loyalty:`)) {
      const d = data as { points: number; balance: number; reason?: string }
      // Refetch user to get the updated loyaltyPoints balance
      fetchUser()
      // Show a toast notification
      const isEarned = event.includes(":earned") || event.includes(":adjusted")
      const points = Math.abs(d.points)
      toast({
        title: isEarned ? `💎 ${points} points added!` : `${points} points adjusted`,
        description: `New balance: ${d.balance} points${d.reason ? ` · ${d.reason}` : ""}`,
      })
    } else if (event.startsWith(`user:${user?.id}:order:`)) {
      // Order status changed — show a toast
      const d = data as { orderNumber: string; status: string }
      const statusMessages: Record<string, string> = {
        confirmed: "✅ Order confirmed!",
        shipped: "🚚 Order shipped!",
        delivered: "🎉 Order delivered!",
        cancelled: "❌ Order cancelled",
      }
      const action = event.split(":").pop() || ""
      const msg = statusMessages[action]
      if (msg) {
        toast({
          title: `Order ${d.orderNumber}`,
          description: msg,
        })
      }
    } else if (event === `user:${user?.id}:account:blocked`) {
      // ─── Section 9: Customer blocked — log out immediately ───────
      toast({
        title: "Account suspended",
        description: "Your account has been suspended. Please contact support.",
        variant: "destructive",
      })
      // Call the logout API to clear cookies, then clear client state
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
      logout()
      goHome()
    } else if (event === `user:${user?.id}:account:unblocked`) {
      // ─── Section 9: Customer unblocked — show reactivation toast ─
      toast({
        title: "Account reactivated",
        description: "Your account has been reactivated. Welcome back!",
      })
    }
  })

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Ignore — we clear client state anyway
    }
    logout()
    toast({ title: "Logged out", description: "See you soon! 🌸" })
    goHome()
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Not logged in</h1>
        <p className="mt-2 text-muted-foreground">Please log in to view your account.</p>
        <Button
          className="mt-6"
          onClick={() => useStore.getState().setView("login")}
        >
          Go to login
        </Button>
      </div>
    )
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const menuItems = [
    { icon: ShoppingBag, label: "My Orders", desc: "Track and view your orders", soon: true },
    { icon: MapPin, label: "Saved Addresses", desc: "Manage delivery addresses", soon: true },
    { icon: Heart, label: "Wishlist", desc: "Your saved products", soon: true },
    { icon: Gift, label: "Loyalty Points", desc: `${user.loyaltyPoints || 0} points available`, soon: true },
  ]

  // Section 9: Wholesale user state
  const isWholesaleApproved = user.wholesaleStatus === "APPROVED" && (user.userType === "WHOLESALE" || user.userType === "BOTH")
  const isWholesalePending = user.wholesaleStatus === "PENDING"
  const isRetail = !isWholesaleApproved && !isWholesalePending

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{user.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {user.phone}
            </span>
            {user.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
              {user.role.toLowerCase()}
            </span>
            {/* Section 9: Wholesale badge */}
            {isWholesaleApproved && (
              <span className="inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                🏪 Wholesale
              </span>
            )}
            {isWholesalePending && (
              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                ⏳ Wholesale Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 9: Wholesale dashboard quick-access for approved users */}
      {isWholesaleApproved && (
        <button
          onClick={() => useStore.getState().setView("wholesale")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left hover:bg-violet-100"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-500 text-white">
            <Store className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-900">🏪 Wholesale Dashboard</p>
            <p className="text-xs text-violet-700">View credit, invoices, reorder & savings</p>
          </div>
          <ChevronRight className="h-4 w-4 text-violet-600" />
        </button>
      )}

      {/* Section 9: Wholesale status check for pending users */}
      {isWholesalePending && (
        <button
          onClick={() => useStore.getState().setView("wholesale")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500 text-white">
            <Clock className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">⏳ Wholesale Application</p>
            <p className="text-xs text-amber-700">Check your application status</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </button>
      )}

      {/* Section 9: Upgrade to Wholesale banner for retail users */}
      {isRetail && (
        <button
          onClick={() => useStore.getState().setView("wholesale")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 text-left hover:from-primary/10 hover:to-primary/15"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">🏪 Upgrade to Wholesale</p>
            <p className="text-xs text-muted-foreground">Save up to 30% on bulk orders</p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary" />
        </button>
      )}

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Orders</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Wishlist</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Points</p>
        </div>
      </div>

      {/* Menu */}
      <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
        {menuItems.map((item, i) => (
          <button
            key={i}
            disabled={item.soon}
            onClick={() => goCatalog(null)}
            className={`flex w-full items-center gap-3 border-b p-4 text-left last:border-b-0 ${
              item.soon ? "cursor-not-allowed opacity-60" : "hover:bg-secondary/30"
            }`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
              <item.icon className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            {item.soon ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Soon
              </span>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => goCatalog(null)}>
          <ShoppingBag className="mr-2 h-4 w-4" /> Continue shopping
        </Button>
        <Button variant="destructive" className="flex-1" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        FreedomCosmeticShop — beauty that unites us
      </p>
    </div>
  )
}
