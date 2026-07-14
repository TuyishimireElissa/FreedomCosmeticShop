'use client'

import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

export default function ErrorState({ type = 'server', onRetry, message }: { type?: 'network' | 'server' | 'load'; onRetry?: () => void; message?: string }) {
  const t = useT()
  const Icon = type === 'network' ? WifiOff : AlertTriangle
  const errorMessage = message || (type === 'network' ? t('errors.network_error') : type === 'load' ? t('errors.load_failed') : t('errors.server_error'))

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-50"><Icon className="h-8 w-8 text-red-500" /></div>
      <p className="mb-4 max-w-sm text-gray-700">{errorMessage}</p>
      {onRetry && <button type="button" onClick={onRetry} className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />{t('errors.try_again')}</button>}
    </div>
  )
}
