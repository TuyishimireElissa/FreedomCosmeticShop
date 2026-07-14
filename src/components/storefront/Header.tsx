"use client"

/**
 * Top navigation header for FreedomCosmeticShop.
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
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SearchWithSuggestions } from "@/components/storefront/SearchWithSuggestions"
import { ShoppingBag, Menu, Sparkles, Shield, User as UserIcon, LogOut, Package, Heart, Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/hooks/use-settings"
import { useT } from "@/lib/i18n/LanguageContext"

export function Header() {
  const t = useT()
  const { goHome, goCatalog, goCart, goAdmin, goLogin, goAccount, cartCount, user, authLoading, logout } = useStore()
  const { toast } = useToast()
  const { settings } = useSettings()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch: cart count is 0 on server but may be >0 on client
  // (persisted in localStorage). Only show the real count after mount.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use 0 until mounted to match server-rendered HTML
  const count = mounted ? cartCount() : 0

  // Detect scroll to add a subtle shadow / blur
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const navLinks = [
    { label: "Skincare", translationKey: 'categories.skincare', slug: "skincare" },
    { label: "Makeup", translationKey: 'categories.makeup', slug: "makeup" },
    { label: "Haircare", translationKey: 'categories.haircare', slug: "haircare" },
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
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.open_menu')}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="text-primary h-4 w-4" />
                FreedomCosmeticShop
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
                {t('nav.home')}
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
                  {t(l.translationKey)}
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
{t('nav.account')}
                  </button>
                  <button
                    onClick={() => {
                      goAdmin()
                      setMobileOpen(false)
                    }}
                    className="text-muted-foreground hover:bg-secondary flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                  >
                    <Shield className="h-4 w-4" />
                    {t('nav.admin')}
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
                  {t('nav.login')} / {t('nav.register')}
                </button>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo — Section 3: Dynamic logo from settings */}
        <button
          onClick={goHome}
          className="flex shrink-0 items-center gap-2"
          aria-label={t('nav.home')}
        >
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="FreedomCosmeticShop" className="max-h-10 max-w-[160px] object-contain" />
          ) : (
            <>
              <span className="bg-primary text-primary-foreground grid h-9 w-9 place-items-center rounded-full">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="hidden text-lg font-semibold tracking-tight sm:inline">
                FreedomCosmeticShop
              </span>
            </>
          )}
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <button
              key={l.slug}
              onClick={() => goCatalog(l.slug)}
              className="text-foreground/80 hover:bg-secondary hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              {t(l.translationKey)}
            </button>
          ))}
        </nav>

        {/* Search with suggestions (desktop) */}
        <div className="ml-auto hidden max-w-xs flex-1 lg:block">
          <SearchWithSuggestions />
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          {/* Admin link (desktop) */}
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={goAdmin}>
            <Shield className="mr-1.5 h-4 w-4" />
            {t('nav.admin')}
          </Button>

          {/* Language switcher (desktop) */}
          <LanguageSwitcher />

          {/* Wishlist icon */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex"
            onClick={() => {
              toast({
                title: t('nav.wishlist'),
                description: t('nav.sign_in_wishlist'),
              })
              if (!user) goLogin()
            }}
            aria-label={t('nav.wishlist')}
          >
            <Heart className="h-5 w-5" />
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
                  <UserIcon className="mr-2 h-4 w-4" /> {t('nav.account')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goCatalog(null)}>
                  <Package className="mr-2 h-4 w-4" /> {t('cart.continue_shopping')}
                </DropdownMenuItem>
                {user.role === "ADMIN" && (
                  <DropdownMenuItem onClick={goAdmin}>
                    <Shield className="mr-2 h-4 w-4" /> {t('footer.admin_dashboard')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
                    logout()
                    toast({ title: t('nav.signed_out') })
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
              {t('nav.login')}
            </Button>
          )}

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={goCart}
            aria-label={`${t('nav.cart')}: ${count}`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-semibold"
              >
                {count > 99 ? "99+" : count}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile search row (only on small screens) */}
      <div className="border-t px-4 py-2 lg:hidden">
        <SearchWithSuggestions placeholder={t('nav.search_placeholder')} />
      </div>
    </header>
  )
}

/**
 * LanguageSwitcher — EN / FR / RW language toggle.
 *
 * For the MVP, this is a visual stub that shows a toast on change.
 * To fully implement, integrate next-intl with locale routing.
 */
function LanguageSwitcher() {
  const t = useT()
  const { toast } = useToast()
  const [current, setCurrent] = useState<"EN" | "FR" | "RW">("EN")

  const languages: { code: "EN" | "FR" | "RW"; label: string; flag: string }[] = [
    { code: "EN", label: "English", flag: "🇬🇧" },
    { code: "FR", label: "Français", flag: "🇫🇷" },
    { code: "RW", label: "Kinyarwanda", flag: "🇷🇼" },
  ]

  const handleCycle = () => {
    const idx = languages.findIndex((l) => l.code === current)
    const next = languages[(idx + 1) % languages.length]
    setCurrent(next.code)
    toast({
      title: t('nav.language_selected', { language: next.label }),
      description:
        next.code === "EN"
          ? t('nav.english_selected')
          : next.code === "FR"
          ? t('nav.french_coming')
          : t('nav.kinyarwanda_selected'),
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="hidden gap-1.5 lg:flex"
      onClick={handleCycle}
      aria-label={t('nav.language_change', { language: current })}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{current}</span>
    </Button>
  )
}
