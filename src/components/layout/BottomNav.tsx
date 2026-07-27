'use client'

import { useEffect, useState, type ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Grid3X3, Home, Search, ShoppingCart, User } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  icon: ElementType
  labelKey: string
  kind: 'home' | 'search' | 'categories' | 'cart' | 'account'
  badge?: number
}

export default function BottomNav() {
  const pathname = usePathname()
  const t = useT()
  const user = useStore((state) => state.user)
  const cartCount = useStore((state) => state.cartCount)
  const [mounted, setMounted] = useState(false)
  const [searchActive, setSearchActive] = useState(false)

  useEffect(() => {
    setMounted(true)
    const syncSearchState = () => {
      setSearchActive(new URLSearchParams(window.location.search).has('search'))
    }
    syncSearchState()
    window.addEventListener('popstate', syncSearchState)
    return () => window.removeEventListener('popstate', syncSearchState)
  }, [])

  useEffect(() => {
    if (mounted) {
      setSearchActive(new URLSearchParams(window.location.search).has('search'))
    }
  }, [mounted, pathname])

  const hideOn = ['/admin', '/checkout']
  if (hideOn.some((path) => pathname.startsWith(path))) return null

  const count = mounted ? cartCount() : 0
  const hasSearch = mounted && searchActive
  const navItems: NavItem[] = [
    { href: '/', icon: Home, labelKey: 'nav.home', kind: 'home' },
    { href: '/products?search=', icon: Search, labelKey: 'common.search', kind: 'search' },
    { href: '/products', icon: Grid3X3, labelKey: 'nav.categories', kind: 'categories' },
    {
      href: '/cart',
      icon: ShoppingCart,
      labelKey: 'nav.cart',
      kind: 'cart',
      badge: count > 0 ? count : undefined,
    },
    {
      href: user ? '/account' : '/login',
      icon: User,
      labelKey: user ? 'nav.account' : 'nav.login',
      kind: 'account',
    },
  ]

  const isActive = (item: NavItem) => {
    if (item.kind === 'home') return pathname === '/'
    if (item.kind === 'search') return pathname === '/products' && hasSearch
    if (item.kind === 'categories') return pathname === '/products' && !hasSearch
    if (item.kind === 'account') return pathname.startsWith('/account') || pathname === '/login'
    return pathname.startsWith(item.href)
  }

  return (
    <>
      <div
        className="block md:hidden"
        aria-hidden="true"
        style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}
      />
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 block border-t border-gray-100 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:hidden',
          'pb-[env(safe-area-inset-bottom)]',
        )}
        aria-label={t('nav.mobile_navigation')}
      >
        <div className="flex h-16 items-stretch">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            const label = t(item.labelKey)

            return (
              <Link
                key={`${item.kind}-${item.href}`}
                href={item.href}
                onClick={() => {
                  if (item.kind === 'search') setSearchActive(true)
                  if (item.kind === 'categories') setSearchActive(false)
                }}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors duration-150 active:bg-gray-50',
                  active ? 'text-[#B76E79]' : 'text-gray-500 hover:text-gray-700',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#B76E79] px-0.5 text-[10px] font-bold leading-none text-white"
                      aria-label={t('cart.items', { count: item.badge })}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate text-[12px] font-medium leading-tight">
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
