'use client'

import { Bell, Menu, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAdminShell } from '@/components/admin/AdminShellContext'
import { useStore } from '@/store/useStore'
import BrandMark from '@/components/brand/BrandMark'

const tabTitles: Record<string, string> = {
  overview: 'Overview',
  orders: 'Orders',
  products: 'Products',
  customers: 'Customers',
  deliveries: 'Deliveries',
  analytics: 'Analytics',
  reports: 'Reports',
  settings: 'Settings',
  staff: 'Staff Accounts',
  security: 'Security Dashboard',
  sms: 'SMS Campaigns',
  payments: 'Payments',
  marketing: 'Marketing',
  wholesale: 'Wholesale',
}

export default function AdminHeader() {
  const { activeTab, setMobileOpen, mobilePanel, setMobilePanel } = useAdminShell()
  const router = useRouter()
  const user = useStore((state) => state.user)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 shadow-sm md:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 text-[#1a1a1a] hover:border-rose-200 hover:bg-rose-50" aria-label="Open admin navigation">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1a1a1a]">{tabTitles[activeTab] || 'Admin'}</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-fcs-text-muted">FCS Admin Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Mini-panel toggle.
          * The only control for this used to live in AdminView's own header,
          * which is now hidden below md to stop two headers stacking on a
          * phone. Without this button the compact panel would be unreachable
          * on exactly the devices it was built for. */}
        <button
          type="button"
          onClick={() => setMobilePanel(!mobilePanel)}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            mobilePanel
              ? 'border-fcs-brand-strong bg-fcs-brand-strong text-white'
              : 'border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
          aria-pressed={mobilePanel}
          aria-label={mobilePanel ? 'Show the full dashboard' : 'Show the quick mobile panel'}
        >
          <Smartphone className="h-5 w-5" />
        </button>
        {/* Notifications.
          * This had no onClick at all — a dead button showing a permanent red
          * dot that never cleared, implying unread items the owner could never
          * open. Real-time order alerts arrive as toasts (useAdminNotifications)
          * and every one of them is an order, so the bell opens the order list.
          * The dot is gone: it was hard-coded, not driven by any unread count,
          * so it signalled nothing. */}
        <button
          type="button"
          onClick={() => router.push('/admin/orders')}
          className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-600 hover:bg-gray-100"
          aria-label="Open orders"
        >
          <Bell className="h-5 w-5" />
        </button>
        <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-fcs-brand-strong text-xs font-bold text-white">
          {user?.name
            ? user.name.charAt(0).toUpperCase()
            : <BrandMark size={36} alt="FreedomCosmeticShop" className="h-9 w-9 rounded-full bg-white object-contain p-1" />}
        </span>
      </div>
    </header>
  )
}
