'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_LANGUAGE,
  isAvailableLanguage,
  resolveTranslation,
  resolveTranslationArray,
  type Language,
  type TranslationVariables,
} from './index'

export const LANGUAGE_STORAGE_KEY = 'fcs_language'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, variables?: TranslationVariables) => string
  tArray: (key: string, variables?: TranslationVariables) => readonly string[]
  isRW: boolean
  isEN: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (isAvailableLanguage(saved)) setLanguageState(saved)
    } catch {
      // Keep English when storage is unavailable or blocked.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language === 'rw' ? 'rw' : 'en'
  }, [language])

  useEffect(() => {
    const syncLanguage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY && isAvailableLanguage(event.newValue)) {
        setLanguageState(event.newValue)
      }
    }
    window.addEventListener('storage', syncLanguage)
    return () => window.removeEventListener('storage', syncLanguage)
  }, [])

  const setLanguage = useCallback((nextLanguage: Language) => {
    if (!isAvailableLanguage(nextLanguage)) return
    setLanguageState(nextLanguage)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    } catch {
      // The in-memory switch still works when storage is unavailable.
    }
  }, [])

  const t = useCallback(
    (key: string, variables?: TranslationVariables) => resolveTranslation(language, key, variables),
    [language],
  )

  const tArray = useCallback(
    (key: string, variables?: TranslationVariables) => resolveTranslationArray(language, key, variables),
    [language],
  )

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t,
    tArray,
    isRW: language === 'rw',
    isEN: language === 'en',
  }), [language, setLanguage, t, tArray])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

export function useT() {
  return useLanguage().t
}
