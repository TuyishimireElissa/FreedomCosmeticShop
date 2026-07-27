import type { Metadata } from 'next'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminAuthGuard from '@/components/admin/AdminAuthGuard'
import { AdminShellProvider } from '@/components/admin/AdminShellContext'
import { BUSINESS } from '@/lib/business-config'

export const metadata: Metadata = {
  title: {
    default: `Admin | ${BUSINESS.name}`,
    template: `%s | ${BUSINESS.invoice.prefix} Admin`,
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminShellProvider>
        <div className="flex h-dvh min-h-0 overflow-hidden bg-[#f8f9fa] text-[#1a1a1a]">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AdminHeader />
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </main>
          </div>
        </div>
      </AdminShellProvider>
    </AdminAuthGuard>
  )
}
