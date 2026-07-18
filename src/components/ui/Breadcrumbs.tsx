'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const t = useT()
  const visibleItems = items.filter((item) => item.name.trim() && item.url.trim() && item.url !== '/')

  if (visibleItems.length === 0) return null

  return (
    <nav aria-label={t('accessibility.breadcrumb')} className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link
            href="/"
            aria-label={t('nav.home')}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-rose-50 hover:text-[#B76E79]"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t('nav.home')}</span>
          </Link>
        </li>

        {visibleItems.map((item, index) => {
          const isCurrent = index === visibleItems.length - 1
          return (
            <li key={`${item.url}-${index}`} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="flex min-h-11 max-w-[min(55vw,20rem)] items-center truncate px-2 font-semibold text-gray-900"
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="flex min-h-11 max-w-[min(40vw,14rem)] items-center truncate rounded-lg px-2 text-gray-600 transition-colors hover:bg-rose-50 hover:text-[#B76E79]"
                >
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
