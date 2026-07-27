'use client'

import { AlertCircle, CheckCircle2, Clock3, RotateCcw, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/LanguageContext'

const CONFIG = {
  PAID: { icon: CheckCircle2, classes: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  PENDING: { icon: Clock3, classes: 'border-amber-300 bg-amber-50 text-amber-900' },
  FAILED: { icon: XCircle, classes: 'border-red-300 bg-red-50 text-red-900' },
  REFUNDED: { icon: RotateCcw, classes: 'border-sky-300 bg-sky-50 text-sky-900' },
  OVERDUE: { icon: AlertCircle, classes: 'border-red-300 bg-red-50 text-red-900' },
} as const

export default function PaymentStatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useT()
  const normalized = status.toUpperCase()
  const config = CONFIG[normalized as keyof typeof CONFIG] || { icon: Clock3, classes: 'border-gray-300 bg-gray-50 text-gray-900' }
  const Icon = config.icon
  const key = `accessibility.payment_status_${normalized.toLowerCase()}`
  const translated = t(key)
  const label = translated === key ? normalized.replaceAll('_', ' ') : translated
  return <span role="status" className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold', config.classes, className)}><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>{label}</span></span>
}
