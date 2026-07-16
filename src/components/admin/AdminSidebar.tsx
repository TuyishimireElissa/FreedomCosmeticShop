'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Package,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { type AdminTab, useAdminShell } from '@/components/admin/AdminShellContext'
import { useStore } from '@/store/useStore'
import { useT } from '@/lib/i18n/LanguageContext'

interface MenuItem {
  label: string
  tab: AdminTab
  icon: LucideIcon
  roles?: string[]
  href?: string
  translationKey?: string
}

const menuGroups: Array<{ group: string; items: MenuItem[] }> = [
  {
    group: 'Main',
    items: [{ label: 'Overview', tab: 'overview', icon: LayoutDashboard }],
  },
  {
    group: 'Commerce',
    items: [
      { label: 'Orders', tab: 'orders', icon: ShoppingCart },
      { label: 'Products', tab: 'products', icon: Package },
      { label: 'Bundles', tab: 'bundles', icon: Package },
      { label: 'Customers', tab: 'customers', icon: Users },
      { label: 'Deliveries', tab: 'deliveries', icon: Truck },
      { label: 'Payments', tab: 'payments', icon: CreditCard },
      { label: 'Wholesale', tab: 'wholesale', icon: Store },
    ],
  },
  {
    group: 'Growth',
    items: [
      { label: 'Analytics', tab: 'analytics', icon: BarChart3 },
      { label: 'WA Analytics', tab: 'analytics', icon: BarChart3, href: '/admin/analytics', translationKey: 'whatsapp.admin_analytics' },
      { label: 'WhatsApp Guide', tab: 'analytics', icon: MessageCircle, href: '/admin/whatsapp-guide', translationKey: 'whatsapp.admin_guide' },
      { label: 'Reports', tab: 'reports', icon: FileText },
      { label: 'Marketing', tab: 'marketing', icon: Megaphone },
      { label: 'SMS Campaigns', tab: 'sms', icon: MessageSquare },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Settings', tab: 'settings', icon: Settings },
      { label: 'Staff Accounts', tab: 'staff', icon: Shield },
      { label: 'Security Dashboard', tab: 'security', icon: ShieldAlert, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ],
  },
]

export default function AdminSidebar() {
  const t = useT()
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  const { activeTab, setActiveTab, mobileOpen, setMobileOpen } = useAdminShell()
  const { user, logout, goHome } = useStore()

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab)
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    goHome()
    router.push('/')
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close admin navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex w-[17.5rem] shrink-0 flex-col overflow-hidden bg-[#151515] text-white shadow-2xl transition-all duration-300 md:relative md:z-20 md:translate-x-0 md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-[4.75rem]' : 'md:w-[17.5rem]'}`}
      >
        <div className="flex h-[72px] shrink-0 items-center border-b border-white/10 px-4">
          <button type="button" onClick={() => selectTab('overview')} className={`flex min-w-0 items-center gap-3 ${collapsed ? 'md:mx-auto' : ''}`} aria-label="Admin overview">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#c98892] to-[#9e5964] text-base font-black shadow-lg shadow-black/25">F</span>
            <span className={`min-w-0 text-left ${collapsed ? 'md:hidden' : ''}`}>
              <span className="block truncate text-sm font-extrabold tracking-tight">FreedomCosmetic</span>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#d999a3]">Admin workspace</span>
            </span>
          </button>
          <button type="button" onClick={() => setMobileOpen(false)} className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white md:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>

        <div className={`border-b border-white/10 px-4 py-3 ${collapsed ? 'md:hidden' : ''}`}>
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#B76E79] text-xs font-bold">{user?.name?.charAt(0).toUpperCase() || 'A'}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{user?.name || 'Administrator'}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{user?.role || 'ADMIN'}</span>
            </span>
          </div>
        </div>

        <nav className="scrollbar-hide flex-1 overflow-y-auto px-2 py-3" aria-label="Admin navigation">
          {menuGroups.map((group) => (
            <div key={group.group} className="mb-3">
              <p className={`px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 ${collapsed ? 'md:hidden' : ''}`}>{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  if (item.roles && (!user || !item.roles.includes(user.role))) return null
                  const Icon = item.icon
                  const active = !item.href && activeTab === item.tab
                  const label = item.translationKey ? t(item.translationKey) : item.tab === 'bundles' ? t('nav.bundles') : item.label
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => { if (item.href) { router.push(item.href); setMobileOpen(false) } else selectTab(item.tab) }}
                      className={`group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                        active
                          ? 'bg-[#B76E79] font-semibold text-white shadow-lg shadow-[#B76E79]/15'
                          : 'text-gray-400 hover:bg-white/[0.07] hover:text-white'
                      } ${collapsed ? 'md:justify-center md:px-2' : ''}`}
                      title={collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                    >
                      {active && <span className="absolute -left-2 h-6 w-1 rounded-r-full bg-[#FFD700]" aria-hidden="true" />}
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={collapsed ? 'md:hidden' : ''}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-2.5">
          <button type="button" onClick={handleLogout} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-red-500/15 hover:text-red-300 ${collapsed ? 'md:justify-center md:px-2' : ''}`} title={collapsed ? 'Sign out' : undefined}>
            <LogOut className="h-[18px] w-[18px] shrink-0" /><span className={collapsed ? 'md:hidden' : ''}>Sign out</span>
          </button>
          <button type="button" onClick={() => setCollapsed((value) => !value)} className="mt-1 hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-300 md:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse sidebar</span></>}
          </button>
        </div>
      </aside>
    </>
  )
}
