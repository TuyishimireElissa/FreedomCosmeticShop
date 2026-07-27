'use client'

import { WholesaleView } from '@/components/wholesale/WholesaleView'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useT } from '@/lib/i18n/LanguageContext'

export default function WholesalePage() {
  const t = useT()
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ name: t('nav.wholesale'), url: '/wholesale' }]} />
      </div>
      <WholesaleView />
    </>
  )
}
