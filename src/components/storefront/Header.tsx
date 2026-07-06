"use client"

/**
 * Top navigation header for Ubumwe Beauty.
 *
 * Features:
 *  - Sticky top, blurred background on scroll
 *  - Logo (text-based, click → home)
 *  - Category nav links (Skincare / Makeup / Haircare)
 *  - Search bar (collapses to icon on mobile)
 *  - Cart button with badge showing item count
 *  - Mobile hamburger menu
 *  - "Admin" link (discreet, bottom of mobile menu)
 */

import { useState, useEffect } from "react"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Search, ShoppingBag, Menu, Sparkles, Shield, User as UserIcon, LogOut, Package } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

export function Header() {
  const { goHome, goCatalog, goCart, goAdmin, goLogin, goAccount, setCatalogSearch, cartCount, user, authLoading, logout } = useStore()
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Detect scroll to add a subtle shadow / blur
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    setCatalogSearch(searchInput.trim())
    goCatalog()
    setMobileOpen(false)
    toast({
      title: "Searching",
      description: `Results for "${searchInput.trim()}"`,
    })
  }

  const navLinks = [
    { label: "Skincare", slug: "skincare" },
    { label: "Makeup", slug: "makeup" },
    { label: "Haircare", slug: "haircare" },
  ]

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${
        scrolled ? "bg-background/85 shadow-sm backdrop-blur-md" : "bg-background/95"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="text-primary h-4 w-4" />
                Ubumwe Beauty
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              <button
                onClick={() => {
                  goHome()
                  setMobileOpen(false)
                }}
                className="hover:bg-secondary rounded-lg px-3 py-2.5 text-left text-sm font-medium"
              >
                Home
              </button>
              {navLinks.map((l) => (
                <button
                  key={l.slug}
                  onClick={() => {
                    goCatalog(l.slug)
                    setMobileOpen(false)
                  }}
                  className="hover:bg-secondary rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                >
                  {l.label}
                </button>
              ))}
              <div className="bg-border my-2 h-px" />
              {user ? (
                <>
                  <button
                    onClick={() => {
                      goAccount()
                      setMobileOpen(false)
                    }}
                    className="hover:bg-secondary flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                  >
                    <UserIcon className="h-4 w-4" />
                    My Account
                  </button>
                  <button
                    onClick={() => {
                      goAdmin()
                      setMobileOpen(false)
                    }}
                    className="text-muted-foreground hover:bg-secondary flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    goLogin()
                    setMobileOpen(false)
                  }}
                  className="hover:bg-secondary flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                >
                  <UserIcon className="h-4 w-4" />
                  Login / Register
                </button>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <button
          onClick={goHome}
          className="flex shrink-0 items-center gap-2"
          aria-label="Go to homepage"
        >
          <span className="bg-primary text-primary-foreground grid h-9 w-9 place-items-center rounded-full">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            Ubumwe <span className="text-primary">Beauty</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <button
              key={l.slug}
              onClick={() => goCatalog(l.slug)}
              className="text-foreground/80 hover:bg-secondary hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Search (desktop) */}
        <form
          onSubmit={handleSearch}
          className="ml-auto hidden max-w-xs flex-1 items-center lg:flex"
        >
          <div className="relative w-full">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 rounded-full pr-3 pl-9"
              aria-label="Search products"
            />
          </div>
        </form>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          {/* Mobile search icon (opens a prompt-style input) */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Search"
            onClick={() => {
              const q = window.prompt("Search products:")
              if (q && q.trim()) {
                setSearchInput(q.trim())
                setCatalogSearch(q.trim())
                goCatalog()
              }
            }}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Admin link (desktop) */}
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={goAdmin}>
            <Shield className="mr-1.5 h-4 w-4" />
            Admin
          </Button>

          {/* Account / Login */}
          {authLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-secondary" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[100px] truncate sm:inline">
                    {user.name.split(" ")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.phone}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={goAccount}>
                  <UserIcon className="mr-2 h-4 w-4" /> My Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goCatalog(null)}>
                  <Package className="mr-2 h-4 w-4" /> Continue Shopping
                </DropdownMenuItem>
                {user.role === "ADMIN" && (
                  <DropdownMenuItem onClick={goAdmin}>
                    <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
                    logout()
                    toast({ title: "Logged out" })
                    goHome()
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={goLogin}>
              <UserIcon className="mr-1.5 h-4 w-4" />
              Login
            </Button>
          )}

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={goCart}
            aria-label={`Cart with ${cartCount()} items`}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount() > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-semibold"
              >
                {cartCount() > 99 ? "99+" : cartCount()}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile search row (only on small screens) */}
      <div className="border-t px-4 py-2 lg:hidden">
        <form onSubmit={handleSearch} className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search skincare, makeup, haircare..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 rounded-full pr-3 pl-9"
            aria-label="Search products"
          />
        </form>
      </div>
    </header>
  )
}
