'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { LANGUAGES, type Language } from '@/lib/i18n'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface LanguageSelectorProps {
  variant?: 'navbar' | 'footer' | 'mobile' | 'pills'
  className?: string
}

const AVAILABLE_LANGUAGES = LANGUAGES.filter((language) => language.available)

export default function LanguageSelector({
  variant = 'navbar',
  className = '',
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage()
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
    setLanguage(nextLanguage)
    setOpen(false)
  }

  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-1 rounded-full bg-gray-100 p-1 ${className}`} role="group" aria-label="Choose language">
        {AVAILABLE_LANGUAGES.map((item) => (
          <button key={item.code} type="button" onClick={() => choose(item.code)} aria-pressed={language === item.code} className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${language === item.code ? 'bg-[#B76E79] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} title={item.nativeName}>
            {item.code.toUpperCase()}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'mobile') {
    return (
      <div className={`grid grid-cols-2 gap-2 ${className}`} role="group" aria-label="Choose language">
        {AVAILABLE_LANGUAGES.map((item) => (
          <button key={item.code} type="button" onClick={() => choose(item.code)} aria-pressed={language === item.code} className={`min-h-12 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-all ${language === item.code ? 'border-[#B76E79] bg-[#B76E79]/10 text-[#B76E79]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <span className="mr-1" aria-hidden="true">{item.flag}</span>{item.code.toUpperCase()}
            <span className="mt-0.5 block text-[10px] font-normal">{item.nativeName}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-10 items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 transition-all hover:border-[#B76E79] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]/40" aria-label="Choose language" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}>
        <Globe className="h-3.5 w-3.5 text-[#B76E79]" aria-hidden="true" />
        <span className="font-bold text-xs">{current.code.toUpperCase()}</span>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label="Languages" className="absolute right-0 top-full z-[90] mt-1 min-w-40 rounded-xl border border-gray-100 bg-white p-1 shadow-xl shadow-black/10">
          {AVAILABLE_LANGUAGES.map((item) => (
            <button key={item.code} type="button" role="menuitemradio" aria-checked={language === item.code} onClick={() => choose(item.code)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${language === item.code ? 'bg-[#B76E79]/10 font-semibold text-[#B76E79]' : 'text-gray-700 hover:bg-gray-50'}`}>
              <span aria-hidden="true">{item.flag}</span>
              <span><span className="block leading-none">{item.nativeName}</span><span className="mt-1 block text-[10px] uppercase text-gray-400">{item.code}</span></span>
              {language === item.code && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
