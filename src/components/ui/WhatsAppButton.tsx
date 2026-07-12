'use client'

import { MessageCircle } from 'lucide-react'

interface WhatsAppButtonProps {
  phone?: string
  message?: string
}

function WhatsAppButtonComponent({
  phone = '250780000000',
  message = 'Hello FreedomCosmeticShop! I need help with my order.',
}: WhatsAppButtonProps = {}) {
  const cleanPhone = phone.replace(/\D/g, '')
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="safe-bottom group fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(37,211,102,0.35)] ring-4 ring-white/90 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B76E79]/40 sm:bottom-6 sm:right-6"
      aria-label="Chat with FreedomCosmeticShop on WhatsApp"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/20 motion-reduce:hidden" aria-hidden="true" />
      <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
        Chat with us
      </span>
    </a>
  )
}

export default WhatsAppButtonComponent
export { WhatsAppButtonComponent as WhatsAppButton }
