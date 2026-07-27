import type { Metadata } from 'next'
import WhatsAppAgentGuide from '@/components/admin/WhatsAppAgentGuide'

export const metadata: Metadata = { title: 'WhatsApp Guide' }

export default function WhatsAppGuidePage() {
  return <div className="p-4 sm:p-6 lg:p-8"><WhatsAppAgentGuide /></div>
}
