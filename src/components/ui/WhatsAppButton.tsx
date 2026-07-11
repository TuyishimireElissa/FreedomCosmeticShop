'use client'
import { MessageCircle } from 'lucide-react'

interface WhatsAppButtonProps {
  phone?: string
  message?: string
}

function WhatsAppButtonComponent({ 
  phone = '250780000000',
  message = 'Hello FreedomCosmeticShop! I need help with my order.'
}: WhatsAppButtonProps = {}) {
  const cleanPhone = phone.replace('+', '').replace(/\s/g, '')
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 animate-pulse"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={28} className="text-white" />
    </a>
  )
}

export default WhatsAppButtonComponent
export { WhatsAppButtonComponent as WhatsAppButton }
