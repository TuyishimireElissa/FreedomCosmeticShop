import type { Metadata } from 'next'
import AdminSystemBackups from '@/components/admin/AdminSystemBackups'

export const metadata: Metadata = { title: 'Backups' }

export default function SystemBackupsPage() {
  return <div className="p-4 sm:p-6 lg:p-8"><AdminSystemBackups /></div>
}
