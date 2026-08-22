import type { Metadata } from 'next'
import AdminWhatsAppPricing from '@/components/admin/AdminWhatsAppPricing'

export const metadata: Metadata = { title: 'WhatsApp Pricing' }

export default function WhatsAppPricingPage() {
  return <div className="p-4 sm:p-6 lg:p-8"><AdminWhatsAppPricing /></div>
}
