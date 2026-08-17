'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Globe,
  Heart,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  User,
  X,
} from 'lucide-react'
import { SearchWithSuggestions } from '@/components/storefront/SearchWithSuggestions'
import SearchOverlay from '@/components/storefront/SearchOverlay'
import LanguageSelector from '@/components/ui/LanguageSelector'
import Logo from '@/components/ui/logo'
import { useLanguage, useT } from '@/lib/i18n/LanguageContext'
import { useScrolled } from '@/hooks/use-scrolled'
import { useSettings } from '@/hooks/use-settings'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/store/useStore'
import { BUSINESS } from '@/lib/business-config'
import LowDataToggle from '@/components/settings/LowDataToggle'
import CategorySoonBadge from '@/components/layout/CategorySoonBadge'
import { liveProductCount, stockedFirst, useCategories } from '@/hooks/use-categories'
import { categoryLabel } from '@/lib/category-i18n-map'


export default function Navbar() {
  const router = useRouter()
  const t = useT()
  // Categories come from the database, not a hardcoded list. The old array
  // linked to Makeup, which has no live products — verified live, that link
  // led to "No products match your filters".
  const { language } = useLanguage()
  const { categories, loading: categoriesLoading } = useCategories()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // Focus returns here when the search overlay closes, so a keyboard or
  // screen-reader user is not dumped at the top of the document.
  const searchTriggerRef = useRef<HTMLButtonElement>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const { settings } = useSettings()
  const { toast } = useToast()
  const {
    user,
    authLoading,
    cartCount,
    logout,
  } = useStore()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const closeAccount = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', closeAccount)
    return () => document.removeEventListener('mousedown', closeAccount)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const count = mounted ? cartCount() : 0
  const scrolled = useScrolled()

  const navigate = (action: () => void) => {
    action()
    setMobileOpen(false)
    setSearchOpen(false)
    setAccountOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
    setAccountOpen(false)
    setMobileOpen(false)
    toast({ title: t('nav.signed_out') })
  }

  const handleWishlist = () => {
    if (!user) {
      toast({ title: t('nav.sign_in_wishlist') })
      router.push('/login')
      return
    }
    router.push('/account/wishlist')
  }

  return (
    // Flat at rest, elevated once content passes beneath it. The border and
    // shadow are what change — not the background, which stays opaque so text
    // scrolling underneath can never show through and fail contrast.
    <header
      className={`sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md transition-[border-color,box-shadow] duration-200 ease-fcs-snap motion-reduce:transition-none ${
        scrolled ? 'border-fcs-border-subtle shadow-fcs-2' : 'border-transparent shadow-none'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 md:h-16 md:gap-6 md:px-6 lg:px-8">
        {/* Left of the logo on phones, which is where Android users reach for
          * it and what the mobile spec asks for. It also puts the menu first
          * in the tab order instead of last. Hidden from md: up, where the
          * category strip below the header replaces it. */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fcs-text transition-colors hover:bg-rose-50 md:hidden"
          aria-label={mobileOpen ? t('nav.close_menu') : t('nav.open_menu')}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => navigate(() => router.push('/'))}
          className="flex min-w-0 shrink-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand"
          aria-label={`${BUSINESS.tradingName} home`}
        >
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={BUSINESS.tradingName}
              className="h-8 w-auto max-w-[150px] object-contain md:h-10 sm:max-w-[190px]"
            />
          ) : (
            <>
              {/* Simplified monogram on phones, where the leaf branch and
                * facial profile would be unreadable and space is scarce. */}
              <Logo size="md" label={t('nav.logo_alt')} className="md:hidden" />
              {/* Full mark from md: up. */}
              <Logo size="lg" label={t('nav.logo_alt')} className="hidden md:block" />
            </>
          )}
        </button>

        <div className="mx-auto hidden w-full max-w-xl md:block">
          <SearchWithSuggestions placeholder={t('nav.search_placeholder')} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-1">
          <button
            ref={searchTriggerRef}
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-full text-fcs-text transition-colors hover:bg-rose-50 md:hidden"
            aria-label={searchOpen ? t('nav.close_search') : t('nav.open_search')}
            aria-expanded={searchOpen}
            aria-haspopup="dialog"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>

          {/* Phones get pills, not the dropdown. The dropdown needs two taps
            * and opens a floating menu; with only two available languages the
            * pills show the current choice and switch in one tap. Before this
            * the header rendered no language control at all under 768px — the
            * only way to switch was to open the burger menu and scroll. */}
          <LanguageSelector variant="pills" className="md:hidden" />
          <LanguageSelector variant="navbar" className="hidden md:block" />

          <button type="button" onClick={() => router.push('/quiz')} className="hidden min-h-10 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-xs font-bold text-fcs-brand-text transition-colors hover:bg-fcs-brand-strong hover:text-white lg:flex">
            {t('nav.quiz')}
          </button>

          <button
            type="button"
            onClick={() => router.push('/support/whatsapp')}
            className="hidden min-h-11 items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-green-50 hover:text-green-700 lg:flex"
          >
            <MessageCircle className="h-4 w-4" /> {t('nav.whatsapp_support')}
          </button>

          <button
            type="button"
            onClick={handleWishlist}
            className="hidden h-11 w-11 place-items-center rounded-full text-fcs-text transition-colors hover:bg-rose-50 hover:text-fcs-brand-text md:grid"
            aria-label={t('nav.wishlist')}
          >
            <Heart className="h-5 w-5" />
          </button>

          {/* Desktop only. BottomNav is `md:hidden` and carries its own cart
            * tab with the same badge, so below 768px this button was a second
            * cart roughly 600px away from the first on one 360px screen.
            * Gated rather than deleted: above 768px BottomNav is gone and
            * this is the only cart in the chrome. */}
          <button
            type="button"
            onClick={() => router.push('/cart')}
            className="relative hidden h-11 w-11 place-items-center rounded-full text-fcs-text transition-colors hover:bg-rose-50 hover:text-fcs-brand-text md:grid"
            aria-label={`${t('nav.cart')}: ${count}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-fcs-brand-strong px-1 text-xs font-bold text-white ring-2 ring-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>

          {authLoading ? (
            <div className="hidden h-9 w-20 animate-pulse rounded-full bg-gray-100 md:block" />
          ) : user ? (
            <div ref={accountRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="flex h-10 items-center gap-1 rounded-full px-2 transition-colors hover:bg-rose-50"
                aria-label={t('nav.account_menu')}
                aria-expanded={accountOpen}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-fcs-brand-strong text-xs font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-2xl shadow-black/10">
                  <div className="border-b border-gray-100 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-gray-500">{user.phone}</p>
                  </div>
                  <button type="button" onClick={() => navigate(() => router.push('/account'))} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-gray-50">
                    <User className="h-4 w-4" /> {t('nav.account')}
                  </button>
                  <button type="button" onClick={() => navigate(() => router.push('/products'))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-gray-50">
                    <Package className="h-4 w-4" /> {t('cart.continue_shopping')}
                  </button>
                  {user.role === 'ADMIN' && (
                    <button type="button" onClick={() => navigate(() => router.push('/admin'))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-fcs-brand-text hover:bg-rose-50">
                      <Shield className="h-4 w-4" /> {t('nav.admin')}
                    </button>
                  )}
                  <button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="hidden rounded-full bg-fcs-brand-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-fcs-brand-strong-hover hover:shadow-md md:block"
            >
              {t('nav.login')}
            </button>
          )}

        </div>
      </div>

      <div className="hidden border-t border-[#EEEEEE] md:block">
        <nav className="scrollbar-hide mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 lg:px-8" aria-label={t('nav.product_categories')}>
          <button type="button" onClick={() => router.push('/products')} className="shrink-0 border-b-2 border-transparent py-3 text-[13px] font-medium text-[#777777] transition-colors hover:border-fcs-brand hover:text-[#1a1a1a]">
            {t('categories.all')}
          </button>
          {categoriesLoading
            ? /* Skeleton matches the real row height so the strip does not jump. */
              [0, 1, 2, 3].map((slot) => (
                <span key={slot} className="my-3 h-4 w-20 shrink-0 animate-pulse rounded bg-fcs-surface-secondary motion-reduce:animate-none" aria-hidden="true" />
              ))
            : categories.map((category) => (
                <button key={category.slug} type="button" onClick={() => router.push(`/products?category=${category.slug}`)} className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent py-3 text-[13px] font-medium text-[#777777] transition-colors hover:border-fcs-brand hover:text-[#1a1a1a]">
                  {categoryLabel(category, t, language)}
                  {liveProductCount(category) === 0 && <CategorySoonBadge />}
                </button>
              ))}
          <button type="button" onClick={() => router.push('/bundles')} className="ml-auto flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-bold text-fcs-brand-text transition-colors hover:border-fcs-brand hover:text-fcs-brand-text">
            {t('nav.bundles')}
          </button>
          <button type="button" onClick={() => router.push('/wholesale')} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-bold text-fcs-brand-text transition-colors hover:border-fcs-brand hover:text-fcs-brand-text">
            {t('nav.wholesale')}
          </button>
        </nav>
      </div>

      {/* Full-screen overlay on phones: voice input, category chips, trending
        * terms and instant results. Replaces the inline strip, which offered
        * only a text field. Desktop keeps the inline SearchWithSuggestions
        * dropdown above — it is already a working combobox. */}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        returnFocusTo={searchTriggerRef}
      />

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto border-t border-gray-100 bg-white shadow-2xl md:hidden">
          <nav className="mx-auto max-w-lg px-4 py-5" aria-label={t('nav.mobile_navigation')}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fcs-text-muted">{t('nav.categories')}</p>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-full bg-gray-100 p-2" aria-label={t('common.close')}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate(() => router.push('/products'))} className="col-span-2 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#f8f9fa] px-4 py-3 text-left font-semibold">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" /> {t('categories.all')}
              </button>
              {categoriesLoading
                ? [0, 1, 2, 3].map((slot) => (
                    <span key={slot} className="min-h-16 animate-pulse rounded-2xl bg-fcs-surface-secondary motion-reduce:animate-none" aria-hidden="true" />
                  ))
                : stockedFirst(categories).map((category) => (
                    <button key={category.slug} type="button" onClick={() => navigate(() => router.push(`/products?category=${category.slug}`))} className="flex min-h-16 flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-gray-100 px-3 py-3 text-left text-sm font-medium transition-colors hover:border-rose-200 hover:bg-rose-50">
                      {categoryLabel(category, t, language)}
                      {liveProductCount(category) === 0 && <CategorySoonBadge />}
                    </button>
                  ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate(() => router.push('/quiz'))} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 text-sm font-bold text-fcs-brand-text">{t('nav.quiz')}</button>
              <button type="button" onClick={() => navigate(() => router.push('/bundles'))} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 text-sm font-bold text-fcs-brand-text">{t('nav.bundles')}</button>
            </div>
            <button type="button" onClick={() => navigate(() => router.push('/wholesale'))} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fff8e7] px-4 py-3 font-bold text-fcs-brand-text ring-1 ring-[#FFD700]/30">
              {t('nav.wholesale_offer')}
            </button>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">{t('nav.language')}</p>
              <LanguageSelector variant="mobile" />
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <LowDataToggle variant="compact" />
            </div>

            <div className="mt-5 space-y-2 border-t border-gray-100 pt-5">
              {user ? (
                <>
                  <button type="button" onClick={() => navigate(() => router.push('/account'))} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium hover:bg-gray-50"><User className="h-5 w-5" /> {t('nav.account')}</button>
                  {user.role === 'ADMIN' && <button type="button" onClick={() => navigate(() => router.push('/admin'))} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium text-fcs-brand-text hover:bg-rose-50"><Shield className="h-5 w-5" /> {t('nav.admin')}</button>}
                  <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-red-100 py-3 font-semibold text-red-600"><LogOut className="h-4 w-4" /> {t('nav.logout')}</button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => navigate(() => router.push('/login'))} className="rounded-full bg-fcs-brand-strong py-3 font-semibold text-white">{t('nav.login')}</button>
                  <button type="button" onClick={() => navigate(() => router.push('/register'))} className="rounded-full border-2 border-fcs-brand py-3 font-semibold text-fcs-brand-text">{t('nav.register')}</button>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-fcs-text p-4 text-xs text-white">
              <button type="button" onClick={() => navigate(() => router.push('/support/whatsapp'))} className="flex min-h-11 items-center gap-2 font-semibold text-green-300"><MessageCircle className="h-4 w-4" />{t('nav.whatsapp_support')}</button>
              <span className="flex items-center gap-1 text-white/70"><Globe className="h-4 w-4" aria-hidden="true" /> {language.toUpperCase()}</span>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
