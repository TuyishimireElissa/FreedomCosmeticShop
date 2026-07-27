import type { Metadata } from 'next'
import WhatsAppSupportView from '@/components/support/WhatsAppSupportView'

export const metadata: Metadata = {
  title: 'WhatsApp Support | FreedomCosmeticShop',
  description: 'Open FreedomCosmeticShop WhatsApp assisted support in Kinyarwanda or English.',
}

export default function WhatsAppSupportPage() {
  return <WhatsAppSupportView />
}
