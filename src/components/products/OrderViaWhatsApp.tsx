'use client'

import { MessageCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatRWF } from '@/lib/format'
import { buildProductOrderMessage, buildWhatsAppUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'
import { useCartStore } from '@/store/cartStore'

interface OrderViaWhatsAppProps {
  product: { id: string; name: string; nameRw?: string; slug: string; price: number; stock: number }
  selectedShade?: string
  selectedSize?: string
  quantity: number
  className?: string
  variant?: 'full' | 'compact' | 'icon-only'
}

export default function OrderViaWhatsApp({ product, selectedShade, selectedSize, quantity, className = '', variant = 'full' }: OrderViaWhatsAppProps) {
  const { t, language } = useLanguage()
  const selectedDistrict = useCartStore((state) => state.selectedDistrict)
  const lang = language === 'en' ? 'en' : 'rw'
  const total = product.price * quantity
  const disabled = product.stock < 1 || quantity < 1 || quantity > product.stock

  const openWhatsApp = () => {
    if (disabled) return
    const productUrl = new URL(`/products/${encodeURIComponent(product.slug)}`, window.location.origin).toString()
    const message = buildProductOrderMessage({
      productName: product.name,
      productNameRw: product.nameRw,
      productUrl,
      price: product.price,
      quantity,
      shade: selectedShade || undefined,
      size: selectedSize || undefined,
      district: selectedDistrict || undefined,
      totalRWF: total,
      language: lang,
    })
    const whatsappUrl = buildWhatsAppUrl(message)
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    trackWhatsAppClick('order_product', {
      productId: product.id,
      productSlug: product.slug,
      district: selectedDistrict || undefined,
      language: lang,
      pagePath: `/products/${product.slug}`,
    })
  }

  const label = disabled ? t('whatsapp.unavailable') : variant === 'compact' ? t('whatsapp.order_product_compact') : t('whatsapp.order_product')
  const base = 'touch-manipulation rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45'
  if (variant === 'icon-only') return <button type="button" onClick={openWhatsApp} disabled={disabled} className={`${base} grid h-11 w-11 place-items-center bg-[#25D366] text-white hover:bg-[#20bd5a] ${className}`} aria-label={label} title={label}><MessageCircle className="h-5 w-5" /></button>
  if (variant === 'compact') return <button type="button" onClick={openWhatsApp} disabled={disabled} className={`${base} flex min-h-12 items-center justify-center gap-2 border-2 border-[#25D366] px-4 text-sm text-green-700 hover:bg-green-50 ${className}`}><MessageCircle className="h-4 w-4" />{label}</button>
  return <div className={`space-y-2 ${className}`}><button type="button" onClick={openWhatsApp} disabled={disabled} className={`${base} flex min-h-[52px] w-full items-center justify-center gap-2 bg-[#25D366] px-5 text-base text-white shadow-lg shadow-green-500/20 hover:bg-[#20bd5a]`}><MessageCircle className="h-5 w-5" />{label}</button>{!disabled && <p className="text-center text-xs leading-5 text-gray-500">{t('whatsapp.order_includes', { name: product.name, count: quantity, price: formatRWF(total) })}{selectedDistrict ? ` · ${selectedDistrict}` : ''}</p>}</div>
}
