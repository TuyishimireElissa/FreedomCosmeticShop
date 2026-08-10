'use client'

import { Suspense, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/store/useStore'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import { CartDrawer } from '@/components/storefront/CartDrawer'
import BottomNav from '@/components/layout/BottomNav'
import LogoSprite from '@/components/brand/LogoSprite'
import { AnalyticsPageTracker } from '@/hooks/useAnalytics'

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const fetchUser = useStore((state) => state.fetchUser)

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const isolatedRoute =
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/change-password'

  if (isolatedRoute) {
    return (
      <div id="main-content" tabIndex={-1} className="main-focus-target">
        <Suspense fallback={null}><AnalyticsPageTracker /></Suspense>
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#1a1a1a]">
      {/* Defines the monogram once per page so repeating placements — product
        * cards, category tiles — cost ~40 bytes each instead of ~2,950. */}
      <LogoSprite />
      <Suspense fallback={null}><AnalyticsPageTracker /></Suspense>
      <AnnouncementBar />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="main-focus-target min-h-[50vh] flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
      <BottomNav />
    </div>
  )
}
