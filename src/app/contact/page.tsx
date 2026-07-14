import type { Metadata } from 'next'
import ContactPageClient from '@/components/contact/ContactPageClient'

export const metadata: Metadata = {
  title: 'Contact Us',
}

export default function ContactPage() {
  return <ContactPageClient />
}
