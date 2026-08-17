'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { DEFAULT_LANGUAGE, LANGUAGES, resolveTranslation, type Language } from '@/lib/i18n'
import { useLanguage, useT } from '@/lib/i18n/LanguageContext'
import { announce } from '@/components/a11y/LiveAnnouncer'

interface LanguageSelectorProps {
  variant?: 'navbar' | 'footer' | 'mobile' | 'pills'
  className?: string
}

const AVAILABLE_LANGUAGES = LANGUAGES.filter((language) => language.available)

/**
 * Pills read left-to-right with the shop's primary language first. The source
 * LANGUAGES array is alphabetical by code, which would put EN before RW —
 * wrong for a Kinyarwanda-first storefront where RW is DEFAULT_LANGUAGE.
 * Sorting here rather than reordering LANGUAGES keeps the dropdown and the
 * mobile-menu grid exactly as they render today.
 */
const PILL_LANGUAGES = [...AVAILABLE_LANGUAGES].sort((a, b) => {
  if (a.code === DEFAULT_LANGUAGE) return -1
  if (b.code === DEFAULT_LANGUAGE) return 1
  return 0
})

/**
 * Confirmation copy already reviewed by a fluent speaker. Resolved against the
 * language being switched *to*, not the hook's `t`, which still holds the old
 * language on the tick the click fires — announcing the change in the language
 * the user just left would be the wrong result.
 */
const SWITCH_ANNOUNCEMENT: Partial<Record<Language, string>> = {
  rw: 'nav.kinyarwanda_selected',
  en: 'nav.english_selected',
}

export default function LanguageSelector({
  variant = 'navbar',
  className = '',
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage()
  const t = useT()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const current = AVAILABLE_LANGUAGES.find((item) => item.code === language)
    || AVAILABLE_LANGUAGES[0]

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const choose = (nextLanguage: Language) => {
    setOpen(false)
    // Tapping the language already in use is a no-op. Re-setting it would fire
    // a redundant announcement and a pointless localStorage write.
    if (nextLanguage === language) return
    setLanguage(nextLanguage)
    const key = SWITCH_ANNOUNCEMENT[nextLanguage]
    if (key) announce(resolveTranslation(nextLanguage, key))
  }

  if (variant === 'pills') {
    return (
      // Two nested boxes on purpose. The <button> is the hit area and is left
      // at 44x44 — globals.css already forces min-width/min-height 44px on
      // every button under 768px, so the WCAG 2.5.5 target comes from the
      // site's own rule rather than from a number repeated here that could
      // drift. The painted pill is the inner <span> at the specified 36px.
      // Sizing the button itself to 36px would have meant opting out of that
      // global rule with .btn-icon-small, which also sets padding:12px and
      // would have silently overridden the horizontal padding below.
      <div
        className={`inline-flex items-center gap-1 rounded-fcs-md border border-fcs-brand-strong bg-fcs-surface px-1 ${className}`}
        role="group"
        aria-label={t('nav.language')}
      >
        {PILL_LANGUAGES.map((item) => {
          const active = language === item.code
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => choose(item.code)}
              aria-pressed={active}
              className="grid h-11 touch-manipulation place-items-center rounded-fcs-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
              title={item.nativeName}
            >
              <span
                className={`grid h-9 min-w-[38px] place-items-center rounded-fcs-sm px-2 text-[13px] font-bold leading-none transition-colors duration-200 ease-fcs-snap motion-reduce:transition-none ${
                  active
                    ? 'bg-fcs-brand-strong text-white'
                    : 'text-fcs-brand-text'
                }`}
              >
                {item.code.toUpperCase()}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'mobile') {
    return (
      <div className={`grid grid-cols-2 gap-2 ${className}`} role="group" aria-label="Choose language">
        {AVAILABLE_LANGUAGES.map((item) => (
          <button key={item.code} type="button" onClick={() => choose(item.code)} aria-pressed={language === item.code} className={`min-h-12 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-all ${language === item.code ? 'border-fcs-brand bg-[#B76E79]/10 text-fcs-brand-text' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <span className="mr-1" aria-hidden="true">{item.flag}</span>{item.code.toUpperCase()}
            <span className="mt-0.5 block text-[10px] font-normal">{item.nativeName}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-11 touch-manipulation items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 transition-all hover:border-fcs-brand hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]/40" aria-label="Choose language" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}>
        <Globe className="h-3.5 w-3.5 text-fcs-brand-text" aria-hidden="true" />
        <span className="font-bold text-xs">{current.code.toUpperCase()}</span>
        <ChevronDown className={`h-3 w-3 text-fcs-text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label="Languages" className="absolute right-0 top-full z-[90] mt-1 min-w-40 rounded-xl border border-gray-100 bg-white p-1 shadow-xl shadow-black/10">
          {AVAILABLE_LANGUAGES.map((item) => (
            <button key={item.code} type="button" role="menuitemradio" aria-checked={language === item.code} onClick={() => choose(item.code)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${language === item.code ? 'bg-[#B76E79]/10 font-semibold text-fcs-brand-text' : 'text-gray-700 hover:bg-gray-50'}`}>
              <span aria-hidden="true">{item.flag}</span>
              <span><span className="block leading-none">{item.nativeName}</span><span className="mt-1 block text-[10px] uppercase text-fcs-text-muted">{item.code}</span></span>
              {language === item.code && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
