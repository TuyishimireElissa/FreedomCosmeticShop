'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const register = () => { void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined) }
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}
