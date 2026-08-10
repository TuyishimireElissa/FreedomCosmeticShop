'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'bundles'
  | 'customers'
  | 'deliveries'
  | 'analytics'
  | 'reports'
  | 'settings'
  | 'staff'
  | 'security'
  | 'sms'
  | 'payments'
  | 'marketing'
  | 'wholesale'

interface AdminShellValue {
  activeTab: AdminTab
  setActiveTab: (tab: AdminTab) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  /**
   * Whether the compact mobile mini-panel replaces the full dashboard.
   *
   * Lives here rather than inside AdminView because the only control that
   * toggled it sat in AdminView's own header, and that header is now hidden
   * below md — which would have left the mobile panel unreachable on the very
   * devices it exists for. AdminHeader (the mobile bar) drives it instead.
   */
  mobilePanel: boolean
  setMobilePanel: (on: boolean) => void
}

const AdminShellContext = createContext<AdminShellValue | null>(null)

export function AdminShellProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState(false)

  const value = useMemo(
    () => ({ activeTab, setActiveTab, mobileOpen, setMobileOpen, mobilePanel, setMobilePanel }),
    [activeTab, mobileOpen, mobilePanel],
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
