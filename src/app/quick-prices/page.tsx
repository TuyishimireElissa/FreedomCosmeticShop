import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuickPricesClient from '@/components/admin/QuickPricesClient'

/**
 * The father's mobile pricing page.
 *
 * Deliberately OUTSIDE /admin: it is reached with a signed 7-day token, not a
 * login, so it must not sit behind AdminAuthGuard. noIndex because a pricing
 * form has no business in search results.
 */
export const metadata: Metadata = {
  title: 'Prices',
  robots: { index: false, follow: false },
}

export default function QuickPricesPage() {
  return (
    <Suspense fallback={null}>
      <QuickPricesClient />
    </Suspense>
  )
}
