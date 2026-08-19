import type { Metadata } from 'next'
import ContentStatusDashboard from '@/components/admin/ContentStatusDashboard'

export const metadata: Metadata = { title: 'Product Content Status' }

export default function ProductContentStatusPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ContentStatusDashboard />
    </div>
  )
}
