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
} from "lucide-react"

export function AccountView() {
  const { user, logout, goHome, goCatalog } = useStore()
  const { toast } = useToast()

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
    { icon: Gift, label: "Loyalty Points", desc: `${0} points available`, soon: true },
  ]

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
          <span className="mt-2 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
            {user.role.toLowerCase()}
          </span>
        </div>
      </div>

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
        Ubumwe Beauty — beauty that unites us
      </p>
    </div>
  )
}
