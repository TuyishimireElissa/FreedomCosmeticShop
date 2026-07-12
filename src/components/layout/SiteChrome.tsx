'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/store/useStore'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/ui/WhatsAppButton'

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const view = useStore((state) => state.view)
  const hideSupportChrome = view === 'login' || view === 'register'

  if (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password'
  ) return <>{children}</>
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, '') || '250780000000'

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#1a1a1a]">
      <AnnouncementBar />
      <Navbar />
      <main className="min-h-[50vh] flex-1">{children}</main>
      {!hideSupportChrome && <Footer />}
      {!hideSupportChrome && <WhatsAppButton phone={whatsappNumber} />}
    </div>
  )
}
