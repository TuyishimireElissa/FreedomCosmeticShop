'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, ShoppingCart,
  Users, Truck, Tag, MessageSquare,
  Image, FileText, Star, Gift,
  BarChart3, Settings, Shield,
  LogOut, ChevronLeft, ChevronRight,
  Store, CreditCard, HelpCircle,
  Bell, Percent
} from 'lucide-react'

const menuItems = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ]
  },
  {
    group: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: Tag },
      { label: 'Brands', href: '/admin/brands', icon: Store },
      { label: 'Inventory', href: '/admin/inventory', icon: Package },
    ]
  },
  {
    group: 'Sales',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
      { label: 'Delivery', href: '/admin/delivery', icon: Truck },
    ]
  },
  {
    group: 'Customers',
    items: [
      { label: 'Customers', href: '/admin/customers', icon: Users },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
      { label: 'Loyalty Points', href: '/admin/loyalty', icon: Gift },
    ]
  },
  {
    group: 'Wholesale',
    items: [
      { label: 'Applications', href: '/admin/wholesale', icon: Store },
      { label: 'WHL Orders', href: '/admin/wholesale/orders', icon: ShoppingCart },
      { label: 'WHL Analytics', href: '/admin/wholesale/analytics', icon: BarChart3 },
    ]
  },
  {
    group: 'Marketing',
    items: [
      { label: 'Promotions', href: '/admin/promotions', icon: Percent },
      { label: 'Coupons', href: '/admin/coupons', icon: Tag },
      { label: 'SMS Campaigns', href: '/admin/sms', icon: MessageSquare },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
    ]
  },
  {
    group: 'Content',
    items: [
      { label: 'Banners', href: '/admin/banners', icon: Image },
      { label: 'Blog Posts', href: '/admin/blog', icon: FileText },
      { label: 'FAQ', href: '/admin/faq', icon: HelpCircle },
    ]
  },
  {
    group: 'Analytics',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { label: 'Reports', href: '/admin/reports', icon: FileText },
    ]
  },
  {
    group: 'System',
    items: [
      { label: 'Staff', href: '/admin/staff', icon: Users },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Security', href: '/admin/security', icon: Shield },
    ]
  },
]

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#1a1a1a] text-white flex flex-col transition-all duration-300 flex-shrink-0 overflow-hidden hidden md:flex`}>
      
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        {!collapsed && (
          <div>
            <p className="font-bold text-sm">
              FreedomCosmetic
            </p>
            <p className="text-xs text-[#B76E79]">
              Admin Panel
            </p>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-[#B76E79] rounded-full flex items-center justify-center mx-auto">
            <span className="font-bold text-sm">F</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-1 rounded ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-2">
        {menuItems.map((group) => (
          <div key={group.group} className="mb-1">
            {!collapsed && (
              <p className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2 font-medium">
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all ${active ? 'bg-[#B76E79] text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/10'} ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/10 flex-shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-red-500/20 transition-all ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
