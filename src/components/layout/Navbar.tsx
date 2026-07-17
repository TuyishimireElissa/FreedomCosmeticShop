'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Globe,
  Gift,
  Heart,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { SearchWithSuggestions } from '@/components/storefront/SearchWithSuggestions'
import LanguageSelector from '@/components/ui/LanguageSelector'
import { useT } from '@/lib/i18n/LanguageContext'
import { useSettings } from '@/hooks/use-settings'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/store/useStore'
import { BUSINESS } from '@/lib/business-config'
import LowDataToggle from '@/components/settings/LowDataToggle'

const categories = [
  { name: 'Skincare', slug: 'skincare', icon: '🧴', translationKey: 'categories.skincare' },
  { name: 'Makeup', slug: 'makeup', icon: '💄', translationKey: 'categories.makeup' },
  { name: 'Hair Care', slug: 'haircare', icon: '💇', translationKey: 'categories.haircare' },
  { name: 'Fragrance', slug: 'fragrance', icon: '🌸', translationKey: 'categories.fragrance' },
  { name: 'Body Care', slug: 'body-care', icon: '🧼', translationKey: 'categories.body_care' },
  { name: "Men's", slug: 'mens-grooming', icon: '🧔', translationKey: 'categories.mens' },
]

export default function Navbar() {
  const router = useRouter()
  const t = useT()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
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
    <header className="sticky top-0 z-50 border-b border-rose-100/70 bg-white/95 shadow-[0_4px_20px_rgba(26,26,26,0.05)] backdrop-blur-xl">
      <div className="hidden border-b border-[#FFD700]/20 bg-[#fff8e7] px-3 py-1.5 md:block">
        <div className="scrollbar-hide mx-auto flex max-w-7xl items-center justify-start gap-3 overflow-x-auto text-xs font-medium text-gray-600 sm:justify-center sm:gap-5 sm:text-xs">
          <span className="flex shrink-0 items-center gap-1"><span aria-hidden="true">💛</span> {t('checkout.mtn_momo')}</span>
          <span className="text-gray-300" aria-hidden="true">|</span>
          <span className="flex shrink-0 items-center gap-1"><span aria-hidden="true">🔴</span> {t('checkout.airtel_money')}</span>
          <span className="text-gray-300" aria-hidden="true">|</span>
          <span className="flex shrink-0 items-center gap-1"><span aria-hidden="true">💳</span> {t('checkout.card_payment')}</span>
          <span className="text-gray-300" aria-hidden="true">|</span>
          <span className="flex shrink-0 items-center gap-1"><span aria-hidden="true">💵</span> {t('checkout.cod')}</span>
        </div>
      </div>

      <div className="mx-auto flex h-[52px] max-w-7xl items-center gap-2 px-3 md:h-[72px] md:gap-4 md:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(() => router.push('/'))}
          className="flex min-w-0 shrink-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]"
          aria-label={`${BUSINESS.tradingName} home`}
        >
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={BUSINESS.tradingName}
              className="h-10 w-auto max-w-[150px] object-contain sm:max-w-[190px]"
            />
          ) : (
            <>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c98892] to-[#9e5964] text-base font-black text-white shadow-md shadow-[#B76E79]/20">
                F
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-[15px] font-extrabold leading-none tracking-tight text-[#1a1a1a] lg:text-base">
                  {BUSINESS.tradingName}
                </span>
                <span className="mt-1 block text-xs font-medium leading-none text-[#B76E79] lg:text-xs">
                  {BUSINESS.tagline} 🇷🇼
                </span>
              </span>
            </>
          )}
        </button>

        <div className="mx-auto hidden w-full max-w-xl md:block">
          <SearchWithSuggestions placeholder={t('nav.search_placeholder')} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-full text-[#1a1a1a] transition-colors hover:bg-rose-50 md:hidden"
            aria-label={searchOpen ? t('nav.close_search') : t('nav.open_search')}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>

          <LanguageSelector variant="navbar" className="hidden md:block" />

          <button type="button" onClick={() => router.push('/quiz')} className="hidden min-h-10 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-xs font-bold text-[#B76E79] transition-colors hover:bg-[#B76E79] hover:text-white lg:flex">
            <Sparkles className="h-4 w-4" /> {t('nav.quiz')}
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
            className="hidden h-11 w-11 place-items-center rounded-full text-[#1a1a1a] transition-colors hover:bg-rose-50 hover:text-[#B76E79] md:grid"
            aria-label={t('nav.wishlist')}
          >
            <Heart className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => router.push('/cart')}
            className="relative grid h-11 w-11 place-items-center rounded-full text-[#1a1a1a] transition-colors hover:bg-rose-50 hover:text-[#B76E79]"
            aria-label={`${t('nav.cart')}: ${count}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#B76E79] px-1 text-xs font-bold text-white ring-2 ring-white">
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
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#B76E79] text-xs font-bold text-white">
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
                    <button type="button" onClick={() => navigate(() => router.push('/admin'))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[#B76E79] hover:bg-rose-50">
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
              className="hidden rounded-full bg-[#B76E79] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#a55d68] hover:shadow-md md:block"
            >
              {t('nav.login')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-full text-[#1a1a1a] transition-colors hover:bg-rose-50 md:hidden"
            aria-label={mobileOpen ? t('nav.close_menu') : t('nav.open_menu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="hidden border-t border-gray-100 md:block">
        <nav className="scrollbar-hide mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 lg:px-8" aria-label={t('nav.product_categories')}>
          <button type="button" onClick={() => router.push('/products')} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-[#B76E79] hover:text-[#B76E79]">
            {t('categories.all')}
          </button>
          {categories.map((category) => (
            <button key={category.slug} type="button" onClick={() => router.push(`/products?category=${category.slug}`)} className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-[#B76E79] hover:text-[#B76E79]">
              <span aria-hidden="true">{category.icon}</span>{t(category.translationKey)}
            </button>
          ))}
          <button type="button" onClick={() => router.push('/bundles')} className="ml-auto flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-bold text-[#B76E79] transition-colors hover:border-[#B76E79] hover:text-[#9e5964]">
            <Gift className="h-4 w-4" /> {t('nav.bundles')}
          </button>
          <button type="button" onClick={() => router.push('/wholesale')} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-bold text-[#B76E79] transition-colors hover:border-[#B76E79] hover:text-[#9e5964]">
            🏪 {t('nav.wholesale')}
          </button>
        </nav>
      </div>

      {searchOpen && (
        <div className="border-t border-gray-100 bg-white px-3 py-3 md:hidden">
          <div className="mx-auto max-w-xl">
            <SearchWithSuggestions placeholder={t('search.placeholder')} />
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto border-t border-gray-100 bg-white shadow-2xl md:hidden">
          <nav className="mx-auto max-w-lg px-4 py-5" aria-label={t('nav.mobile_navigation')}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">{t('nav.categories')}</p>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-full bg-gray-100 p-2" aria-label={t('common.close')}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate(() => router.push('/products'))} className="col-span-2 flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#f8f9fa] px-4 py-3 text-left font-semibold">
                <span className="text-xl">🛍️</span> {t('categories.all')}
              </button>
              {categories.map((category) => (
                <button key={category.slug} type="button" onClick={() => navigate(() => router.push(`/products?category=${category.slug}`))} className="flex min-h-16 items-center gap-2 rounded-2xl border border-gray-100 px-3 py-3 text-left text-sm font-medium transition-colors hover:border-rose-200 hover:bg-rose-50">
                  <span className="text-xl" aria-hidden="true">{category.icon}</span>{t(category.translationKey)}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate(() => router.push('/quiz'))} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 text-sm font-bold text-[#B76E79]"><Sparkles className="h-4 w-4" />{t('nav.quiz')}</button>
              <button type="button" onClick={() => navigate(() => router.push('/bundles'))} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 text-sm font-bold text-[#B76E79]"><Gift className="h-4 w-4" />{t('nav.bundles')}</button>
            </div>
            <button type="button" onClick={() => navigate(() => router.push('/wholesale'))} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fff8e7] px-4 py-3 font-bold text-[#9e5964] ring-1 ring-[#FFD700]/30">
              🏪 {t('nav.wholesale_offer')}
            </button>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{t('nav.language')}</p>
              <LanguageSelector variant="mobile" />
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <LowDataToggle variant="compact" />
            </div>

            <div className="mt-5 space-y-2 border-t border-gray-100 pt-5">
              {user ? (
                <>
                  <button type="button" onClick={() => navigate(() => router.push('/account'))} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium hover:bg-gray-50"><User className="h-5 w-5" /> {t('nav.account')}</button>
                  {user.role === 'ADMIN' && <button type="button" onClick={() => navigate(() => router.push('/admin'))} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium text-[#B76E79] hover:bg-rose-50"><Shield className="h-5 w-5" /> {t('nav.admin')}</button>}
                  <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-red-100 py-3 font-semibold text-red-600"><LogOut className="h-4 w-4" /> {t('nav.logout')}</button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => navigate(() => router.push('/login'))} className="rounded-full bg-[#B76E79] py-3 font-semibold text-white">{t('nav.login')}</button>
                  <button type="button" onClick={() => navigate(() => router.push('/register'))} className="rounded-full border-2 border-[#B76E79] py-3 font-semibold text-[#B76E79]">{t('nav.register')}</button>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#1a1a1a] p-4 text-xs text-white">
              <button type="button" onClick={() => navigate(() => router.push('/support/whatsapp'))} className="flex min-h-11 items-center gap-2 font-semibold text-green-300"><MessageCircle className="h-4 w-4" />{t('nav.whatsapp_support')}</button>
              <span className="flex items-center gap-1 text-white/70"><Globe className="h-4 w-4" /> RW</span>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
