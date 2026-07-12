'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'customers'
  | 'deliveries'
  | 'analytics'
  | 'reports'
  | 'settings'
  | 'staff'
  | 'sms'
  | 'payments'
  | 'marketing'
  | 'wholesale'

interface AdminShellValue {
  activeTab: AdminTab
  setActiveTab: (tab: AdminTab) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const AdminShellContext = createContext<AdminShellValue | null>(null)

export function AdminShellProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  const value = useMemo(
    () => ({ activeTab, setActiveTab, mobileOpen, setMobileOpen }),
    [activeTab, mobileOpen],
  )

  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>
}

export function useAdminShell() {
  const context = useContext(AdminShellContext)
  if (!context) throw new Error('useAdminShell must be used inside AdminShellProvider')
  return context
}

export function useOptionalAdminShell() {
  return useContext(AdminShellContext)
}
