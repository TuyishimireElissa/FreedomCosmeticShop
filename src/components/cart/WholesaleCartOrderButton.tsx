'use client'

import Link from 'next/link'
import { FileText, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { WholesaleCartOrderItem } from '@/lib/wholesale-whatsapp'

interface WholesaleCartOrderButtonProps {
  items: WholesaleCartOrderItem[]
  managerWhatsApp?: string | null
  onClearCart: () => void
  onNavigate?: () => void
  className?: string
}

/**
 * Wholesale checkout always goes through the professional invoice preview.
 * The existing prop shape is retained so cart page and drawer share one CTA.
 */
export default function WholesaleCartOrderButton({ onNavigate, className = '' }: WholesaleCartOrderButtonProps) {
  const { language } = useLanguage()
  const isKinyarwanda = language !== 'en'

  return <Link
    href="/wholesale/order-preview"
    onClick={onNavigate}
    className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-center text-base font-bold text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${className}`}
  >
    <span className="relative" aria-hidden="true"><FileText className="h-5 w-5" /><MessageCircle className="absolute -bottom-1 -right-2 h-3 w-3 fill-[#25D366] text-white" /></span>
    {isKinyarwanda ? 'Reba Fagitire maze Utumize kuri WhatsApp' : 'Order via WhatsApp'}
  </Link>
}
