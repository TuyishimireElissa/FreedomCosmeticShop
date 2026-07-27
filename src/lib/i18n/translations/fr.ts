import type { EnglishTranslations } from './en'

type DeepPartial<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

/**
 * French translation structure — intentionally unavailable.
 * Add reviewed French content later, then set `available: true` in i18n/index.ts.
 */
export const fr: DeepPartial<EnglishTranslations> = {
  common: {},
  nav: {},
  categories: {},
  product: {},
  search: {},
  cart: {},
  checkout: {},
  auth: {},
  orders: {},
  delivery: {},
  errors: {},
  empty: {},
  whatsapp: {},
  policies: {},
  faq: {},
  loyalty: {},
  skin_types: {},
}
