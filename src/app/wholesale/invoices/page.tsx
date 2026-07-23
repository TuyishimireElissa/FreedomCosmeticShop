'use client'

import { useRouter } from 'next/navigation'
import { WholesaleInvoices } from '@/components/wholesale/WholesaleInvoices'

export default function WholesaleInvoicesPage() {
  const router = useRouter()
  return <WholesaleInvoices onBack={() => router.push('/wholesale/dashboard')} />
}
