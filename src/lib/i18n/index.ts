import { en } from './translations/en'
import { rw } from './translations/rw'
import { fr } from './translations/fr'

export type Language = 'en' | 'rw' | 'fr'
export type TranslationKey = keyof typeof en

export const translations = { en, rw, fr } as const

export const LANGUAGES = [
  {
    code: 'en' as const,
    name: 'English',
    nativeName: 'English',
    flag: '🇷🇼',
    available: true,
  },
  {
    code: 'rw' as const,
    name: 'Kinyarwanda',
    nativeName: 'Ikinyarwanda',
    flag: '🇷🇼',
    available: true,
  },
  {
    code: 'fr' as const,
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    available: false,
  },
] satisfies ReadonlyArray<{
  code: Language
  name: string
  nativeName: string
  flag: string
  available: boolean
}>

export const DEFAULT_LANGUAGE: Language = 'en'

export type TranslationVariables = Record<string, string | number>

function readPath(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || !(segment in current)) return undefined
    return (current as Record<string, unknown>)[segment]
  }, source)
}

export function isAvailableLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some(
    (language) => language.code === value && language.available,
  )
}

export function resolveTranslation(
  language: Language,
  key: string,
  variables: TranslationVariables = {},
): string {
  const requested = readPath(translations[language], key)
  const fallback = readPath(translations.en, key)
  const value = typeof requested === 'string'
    ? requested
    : typeof fallback === 'string'
      ? fallback
      : undefined

  return value === undefined ? key : interpolate(value, variables)
}

export function resolveTranslationArray(
  language: Language,
  key: string,
  variables: TranslationVariables = {},
): readonly string[] {
  const requested = readPath(translations[language], key)
  const fallback = readPath(translations.en, key)
  const value = Array.isArray(requested)
    ? requested
    : Array.isArray(fallback)
      ? fallback
      : []

  return value.map((item) => interpolate(String(item), variables))
}

/** Replace `{variable}` tokens without evaluating translation content. */
export function interpolate(
  text: string,
  vars: Record<string, string | number> = {},
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    text,
  )
}
