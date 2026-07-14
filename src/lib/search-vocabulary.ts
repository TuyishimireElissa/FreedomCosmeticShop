/**
 * Rwanda cosmetics local-search vocabulary.
 *
 * 🔍 REVIEW: Kinyarwanda vocabulary must be reviewed by a fluent speaker and
 * local cosmetics retailer before production search analytics are finalized.
 */

export const LOCAL_SEARCH_VOCABULARY: Readonly<Record<string, readonly string[]>> = {
  // Broad categories — 🔍 REVIEW
  uruhu: ['skincare', 'skin care', 'skin', 'face cream'],
  'kwita ku ruhu': ['skincare', 'skin care', 'face care'],
  umusatsi: ['haircare', 'hair care', 'hair'],
  'kwita ku musatsi': ['haircare', 'hair treatment'],
  kwisiga: ['makeup', 'cosmetics'],
  'ibikoresho byo kwisiga': ['makeup', 'cosmetics'],
  imibavu: ['fragrance', 'perfume'],
  umubiri: ['body care', 'body lotion', 'body'],
  'kwita ku mubiri': ['body care', 'body lotion'],

  // Common product language — 🔍 REVIEW
  amavuta: ['oil', 'lotion', 'cream', 'body butter'],
  "amavuta y'uruhu": ['face oil', 'skin oil', 'serum'],
  'amavuta y’uruhu': ['face oil', 'skin oil', 'serum'],
  "amavuta y'umusatsi": ['hair oil', 'hair serum'],
  'amavuta y’umusatsi': ['hair oil', 'hair serum'],
  isabune: ['soap', 'cleanser', 'face wash', 'body wash'],
  'isabune yo mu maso': ['face wash', 'facial cleanser'],
  kremu: ['cream', 'moisturizer', 'face cream'],
  lisiyo: ['lotion', 'body lotion'],
  parufe: ['perfume', 'fragrance'],
  puderi: ['powder', 'face powder'],
  fondasiyo: ['foundation'],
  lipisitiki: ['lipstick', 'lip color'],
  masikara: ['mascara'],

  // Customer needs — 🔍 REVIEW
  'uruhu rwumye': ['dry skin', 'moisturizer', 'hydrating'],
  'uruhu rugira amavuta': ['oily skin', 'oil control', 'mattifying'],
  'uruhu rworoshye': ['sensitive skin', 'soothing', 'gentle'],
  'umusatsi ugwa': ['hair loss', 'hair growth treatment'],
  'gukura k’umusatsi': ['hair growth', 'hair treatment'],
  'uruhu rufite ibiheri': ['acne', 'pimples', 'spot treatment'],

  // English and common spelling variants
  moisturizer: ['moisturizer', 'moisturizing cream'],
  moisturiser: ['moisturizer', 'moisturizing cream'],
  mosturizer: ['moisturizer'],
  sunscreen: ['sunscreen', 'SPF', 'sun protection'],
  sunscrin: ['sunscreen'],
  'face wash': ['face wash', 'facial cleanser'],
  'fece wash': ['face wash'],
  shampoo: ['shampoo'],
  shampou: ['shampoo'],
  conditioner: ['conditioner'],
  kondishina: ['conditioner'],
  'dark spots': ['dark spot treatment', 'brightening serum'],
  acne: ['acne treatment', 'pimples', 'spot treatment'],
  pimples: ['acne', 'spot treatment'],
  'hair growth': ['hair growth oil', 'hair treatment'],

  // Common brand spellings
  loreal: ["L'Oréal", 'Loreal'],
  "l'oreal": ["L'Oréal"],
  nivea: ['Nivea'],
  neutrogena: ['Neutrogena'],
  maybelline: ['Maybelline'],
  dove: ['Dove'],
  vaseline: ['Vaseline'],
}

export interface PriceSearch {
  minPrice?: number
  maxPrice?: number
  matchedText: string
}

const amount = '(\\d[\\d\\s,.]*)'
const PRICE_PATTERNS: ReadonlyArray<{
  pattern: RegExp
  parse: (match: RegExpMatchArray) => Omit<PriceSearch, 'matchedText'>
}> = [
  { pattern: new RegExp(`(?:under|below|less than)\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ maxPrice: parseAmount(match[1]) }) },
  { pattern: new RegExp(`(?:munsi ya|kutarenza)\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ maxPrice: parseAmount(match[1]) }) }, // 🔍 REVIEW
  { pattern: new RegExp(`(?:between|from)\\s+${amount}\\s*(?:and|to|-)\\s*${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) },
  { pattern: new RegExp(`hagati ya\\s+${amount}\\s+na\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) }, // 🔍 REVIEW
  { pattern: new RegExp(`${amount}\\s*[-–]\\s*${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) },
]

function parseAmount(value: string): number {
  return Number.parseInt(value.replace(/[\s,.]/g, ''), 10)
}

export function expandSearchQuery(query: string): string[] {
  const normalized = query.toLocaleLowerCase('rw-RW').trim().replace(/\s+/g, ' ')
  if (!normalized) return []
  const terms = new Set<string>([normalized])

  for (const [localTerm, mappedTerms] of Object.entries(LOCAL_SEARCH_VOCABULARY)) {
    if (normalized.includes(localTerm) || (normalized.length >= 3 && localTerm.startsWith(normalized))) {
      mappedTerms.forEach((term) => terms.add(term))
    }
  }

  return [...terms]
}

export function parsePriceFromQuery(query: string): PriceSearch | null {
  for (const { pattern, parse } of PRICE_PATTERNS) {
    const match = query.match(pattern)
    if (!match) continue
    const prices = parse(match)
    if ((!prices.minPrice && !prices.maxPrice) || (prices.minPrice && prices.maxPrice && prices.minPrice > prices.maxPrice)) return null
    return { ...prices, matchedText: match[0] }
  }
  return null
}

export function removePriceExpression(query: string, price: PriceSearch | null): string {
  if (!price) return query.trim()
  return query.replace(price.matchedText, ' ').replace(/\s+/g, ' ').trim()
}

export function getSearchSuggestions(query: string, maxSuggestions = 5): string[] {
  const normalized = query.toLocaleLowerCase('rw-RW').trim()
  if (normalized.length < 2) return []
  return Object.keys(LOCAL_SEARCH_VOCABULARY)
    .filter((term) => term.startsWith(normalized) && term !== normalized)
    .slice(0, Math.max(0, maxSuggestions))
}

export const POPULAR_PRICE_SEARCHES = [
  { label: 'Under 5,000 RWF', query: 'under 5000 RWF', maxPrice: 5000 },
  { label: 'Under 10,000 RWF', query: 'under 10000 RWF', maxPrice: 10000 },
  { label: 'Under 20,000 RWF', query: 'under 20000 RWF', maxPrice: 20000 },
] as const

export const POPULAR_LOCAL_SEARCHES = [
  'uruhu',
  'umusatsi',
  'amavuta',
  'isabune',
] as const
