import type { Metadata } from 'next'
import WhatsAppOrdersView from '@/components/admin/WhatsAppOrdersView'

export const metadata: Metadata = { title: 'WhatsApp Orders' }

export default function WhatsAppOrdersPage() {
  return <div className="p-4 sm:p-6 lg:p-8"><WhatsAppOrdersView /></div>
}
