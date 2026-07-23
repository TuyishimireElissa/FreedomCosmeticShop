'use client'

import { useRouter } from 'next/navigation'
import { WholesaleDashboard } from '@/components/wholesale/WholesaleDashboard'

export default function WholesaleDashboardPage() {
  const router = useRouter()
  return <WholesaleDashboard onInvoices={() => router.push('/wholesale/invoices')} onCatalog={() => router.push('/products')} />
}
