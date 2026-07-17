'use client'

import { useT } from '@/lib/i18n/LanguageContext'

export default function SkipToContent() {
  const t = useT()

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[#B76E79] focus:px-6 focus:py-3 focus:font-bold focus:text-white focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2"
    >
      {t('accessibility.skip_to_content')}
    </a>
  )
}
