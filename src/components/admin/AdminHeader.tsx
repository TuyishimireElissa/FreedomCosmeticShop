'use client'

import { Bell, Menu } from 'lucide-react'
import { useAdminShell } from '@/components/admin/AdminShellContext'
import { useStore } from '@/store/useStore'

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
  const { activeTab, setMobileOpen } = useAdminShell()
  const user = useStore((state) => state.user)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 shadow-sm md:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 text-[#1a1a1a] hover:border-rose-200 hover:bg-rose-50" aria-label="Open admin navigation">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1a1a1a]">{tabTitles[activeTab] || 'Admin'}</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-gray-400">FCS Admin Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#B76E79] text-xs font-bold text-white">
          {user?.name?.charAt(0).toUpperCase() || 'A'}
        </span>
      </div>
    </header>
  )
}
