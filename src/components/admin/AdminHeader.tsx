'use client'
import { Bell, Search, Menu } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function AdminHeader() {
  const { data: session } = useSession()

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 h-16 flex items-center justify-between flex-shrink-0">

      {/* Mobile Menu */}
      <button className="md:hidden p-2 rounded-lg hover:bg-gray-100">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders, products, customers..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#B76E79]"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* Admin Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#B76E79] rounded-full flex items-center justify-center text-white font-bold text-sm">
            {session?.user?.name?.[0] || 'A'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-none">
              {session?.user?.name || 'Admin'}
            </p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">
              {(session?.user as any)?.role || 'ADMIN'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
