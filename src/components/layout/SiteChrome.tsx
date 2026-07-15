'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/store/useStore'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import { CartDrawer } from '@/components/storefront/CartDrawer'
import BottomNav from '@/components/layout/BottomNav'

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

  if (isolatedRoute) return <>{children}</>

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#1a1a1a]">
      <AnnouncementBar />
      <Navbar />
      <main className="min-h-[50vh] flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
      <BottomNav />
    </div>
  )
}
