'use client'

import { useEffect } from 'react'
import { AdminView } from '@/components/admin/AdminView'
import { type AdminTab, useAdminShell } from '@/components/admin/AdminShellContext'

export default function AdminFeaturePage({ tab }: { tab: AdminTab }) {
  const { setActiveTab } = useAdminShell()
  useEffect(() => { setActiveTab(tab) }, [setActiveTab, tab])
  return <AdminView embedded />
}
