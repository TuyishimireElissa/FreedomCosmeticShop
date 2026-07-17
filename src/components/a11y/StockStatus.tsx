'use client'

import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/LanguageContext'

interface StockStatusProps {
  stock: number
  lowStockThreshold?: number
  className?: string
  compact?: boolean
}

export default function StockStatus({ stock, lowStockThreshold = 5, className, compact = false }: StockStatusProps) {
  const t = useT()
  const safeStock = Math.max(0, Math.trunc(stock))

  if (safeStock === 0) {
    return <span role="status" className={cn('inline-flex items-center gap-1.5 font-semibold text-red-700', compact ? 'text-xs' : 'text-sm', className)}><XCircle className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{t('common.sold_out')}</span></span>
  }
  if (safeStock <= lowStockThreshold) {
    return <span role="status" className={cn('inline-flex items-center gap-1.5 font-semibold text-amber-800', compact ? 'text-xs' : 'text-sm', className)}><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{t('common.low_stock', { count: safeStock })}</span></span>
  }
  return <span role="status" className={cn('inline-flex items-center gap-1.5 font-semibold text-emerald-800', compact ? 'text-xs' : 'text-sm', className)}><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{t('common.in_stock')}<span className="sr-only">: {t('cart.stock_available', { count: safeStock })}</span></span></span>
}
