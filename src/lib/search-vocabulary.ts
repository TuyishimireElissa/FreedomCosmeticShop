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
  'umusatsi ugwa': ['hair loss', 'hair growth treatment', 'hair fall', 'alopecia', 'thinning hair'],
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
  loreal: ["L'Oréal", 'Loreal', 'LOreal'],
  "l'oreal": ["L'Oréal"],
  nivea: ['Nivea'],
  neutrogena: ['Neutrogena'],
  maybelline: ['Maybelline'],
  dove: ['Dove'],
  vaseline: ['Vaseline'],

  // Skin concerns — terms supplied by the Rwanda catalogue team; fluent review remains required.
  ibiheri: ['acne', 'pimples', 'blemishes', 'spots', 'breakouts'],
  'ibiheri byo mu maso': ['face acne', 'facial acne', 'acne treatment'],
  utunyota: ['dark spots', 'hyperpigmentation', 'blemish marks'],
  "utunyota tw'umunzani": ['sun spots', 'age spots', 'dark patches'],
  "indwara z'uruhu": ['skin problems', 'skin issues', 'skin concerns'],
  'uruhu rusuka': ['itchy skin', 'skin itch', 'pruritus'],
  'uruhu rwaruka': ['peeling skin', 'flaky skin', 'dry flakes'],
  "imirire y'imbere": ['wrinkles', 'fine lines', 'aging skin'],
  inguni: ['redness', 'skin redness', 'irritation', 'rosacea'],
  amahuri: ['blackheads', 'whiteheads', 'clogged pores'],
  imitsina: ['pores', 'open pores', 'large pores', 'pore minimizer'],
  'uruhu rurabagirana': ['uneven skin tone', 'patchy skin'],
  "kuringanya ibara ry'uruhu": ['skin brightening', 'even tone', 'fairness'],
  'uruhu ruryoha': ['glowing skin', 'glass skin', 'luminous skin'],
  'gutunga uruhu': ['hydrating', 'moisturizing', 'dry skin relief'],
  uruhinja: ['sensitive skin reaction', 'allergy', 'skin allergy'],
  'gusukura imitsina': ['pore cleansing', 'deep cleanse', 'pore strips'],

  // Hair concerns
  "gukura kw'umusatsi": ['hair growth', 'grow hair faster', 'hair length'],
  'umusatsi wumye': ['dry hair', 'brittle hair', 'damaged hair'],
  'umusatsi utemba': ['dandruff', 'flaky scalp', 'itchy scalp'],
  'imitwe mishya': ['split ends', 'damaged ends', 'hair breakage'],
  'umusatsi uraba agace': ['fine hair', 'thinning hair', 'volume'],
  'umusatsi uganda': ['frizzy hair', 'frizz control', 'smooth hair'],
  "umusatsi w'amavuta": ['greasy hair', 'oily scalp', 'oily hair'],
  "umuzizi w'umusatsi": ['natural hair', 'afro hair', 'coily hair'],
  'gufuha umusatsi': ['straightening', 'relaxer', 'keratin treatment'],
  'umusatsi mwiza': ['healthy hair', 'shiny hair', 'strong hair'],
  "itara ry'umusatsi": ['hair color', 'hair dye', 'color treatment'],
  'gukuraho ibisi': ['hair removal', 'depilatory', 'wax'],
  "ubunini bw'umusatsi": ['hair thickness', 'thickening', 'volume boost'],

  // Product benefits
  'gutesha ibara': ['whitening', 'lightening', 'brightening', 'fairness'],
  gutunga: ['moisturizing', 'hydrating', 'nourishing', 'softening'],
  'kwirinda izuba': ['sun protection', 'SPF', 'sunscreen', 'UV protection'],
  'gutabara imirire': ['anti-aging', 'anti-wrinkle', 'firming', 'lifting'],
  'gusubiza uruhu': ['skin repair', 'healing', 'restoring', 'regenerating'],
  'gukuraho amafuta': ['oil control', 'mattifying', 'sebum control'],
  kuringanisha: ['balancing', 'skin balancing', 'pH balance'],
  'gutunga buri munsi': ['daily moisturizer', 'everyday cream', 'daily care'],
  'ubuvura bwa po': ['overnight cream', 'night cream', 'sleep mask'],
  'ubuvura bwihuse': ['fast acting', 'quick results', 'instant glow'],
  ibidukikije: ['natural', 'organic', 'chemical free', 'vegan'],
  'nta ibangobango': ['paraben free', 'sulfate free', 'cruelty free'],
  'gucuragira uruhu': ['toning', 'tightening', 'firming skin'],
  'gutunga umusatsi': ['hair conditioning', 'deep conditioning', 'moisturizing hair'],

  // Shades and colours
  'irangi ryerurutse': ['light shade', 'fair', 'light skin', 'porcelain'],
  'irangi rya gisukari': ['medium shade', 'medium skin', 'beige', 'tan'],
  "irangi ry'umunzani": ['dark shade', 'deep', 'dark skin', 'rich'],
  "irangi ry'ubutaka": ['brown shade', 'chestnut', 'mocha', 'chocolate'],
  "irangi ry'umuhondo": ['golden shade', 'golden', 'warm undertone'],
  'irangi rya baraza': ['peach shade', 'peachy', 'warm skin'],
  "irangi ry'ibaba": ['neutral shade', 'neutral undertone', 'neutral'],
  'irangi rya barafu': ['cool shade', 'cool undertone', 'pink undertone'],
  'utunyota twangwa': ['no shade', 'clear', 'transparent', 'colorless'],

  // Brand name variations and common misspellings
  niveya: ['Nivea'],
  nivia: ['Nivea'],
  niver: ['Nivea'],
  lorial: ["L'Oréal"],
  loril: ["L'Oréal"],
  'dark lovely': ['Dark & Lovely'],
  'dark and lovely': ['Dark & Lovely'],
  'dark n lovely': ['Dark & Lovely'],
  darklovely: ['Dark & Lovely'],
  neutrojina: ['Neutrogena'],
  nutrogina: ['Neutrogena'],
  meybelline: ['Maybelline'],
  meybeline: ['Maybelline'],
  vaserine: ['Vaseline'],
  bazerin: ['Vaseline'],
  olay: ['Olay', 'Oil of Olay'],
  oley: ['Olay'],
  ponds: ["Pond's"],
  pond: ["Pond's"],
  cetaphil: ['Cetaphil'],
  setafil: ['Cetaphil'],
  garnier: ['Garnier'],
  garnie: ['Garnier'],
  schwarzkopf: ['Schwarzkopf'],
  shwartzkopf: ['Schwarzkopf'],
  revlon: ['Revlon'],
  revlone: ['Revlon'],
  noxzema: ['Noxzema'],

  // Ingredients
  'acide hyaluronique': ['hyaluronic acid', 'HA', 'hydration serum'],
  'hyaluronic acid': ['hyaluronic acid', 'hydrating serum', 'water retention'],
  'vitamine c': ['vitamin C', 'ascorbic acid', 'brightening serum'],
  'vitamin c': ['vitamin C', 'brightening', 'antioxidant serum'],
  retinol: ['retinol', 'vitamin A', 'anti-aging', 'wrinkle cream'],
  niacinamide: ['niacinamide', 'vitamin B3', 'pore minimizer', 'brightening'],
  'salicylic acid': ['salicylic acid', 'BHA', 'acne treatment', 'exfoliant'],
  'glycolic acid': ['glycolic acid', 'AHA', 'exfoliating', 'peel'],
  'shea butter': ['shea butter', 'amavuta ya karité', 'moisturizer'],
  'amavuta ya karité': ['shea butter', 'moisturizing cream', 'body butter'],
  'coconut oil': ['coconut oil', 'amavuta ya coco', 'hair oil'],
  'amavuta ya coco': ['coconut oil', 'natural oil', 'hair moisturizer'],
  'argan oil': ['argan oil', 'moroccan oil', 'hair serum'],
  'castor oil': ['castor oil', 'hair growth oil', 'thick hair'],
  'tea tree': ['tea tree oil', 'acne treatment', 'antibacterial'],
  ceramides: ['ceramides', 'skin barrier', 'moisturizing', 'sensitive skin'],
  collagen: ['collagen', 'anti-aging', 'firming', 'elasticity'],
  spf: ['SPF', 'sunscreen', 'sun protection', 'UV filter'],
  'benzoyl peroxide': ['benzoyl peroxide', 'acne treatment', 'spot treatment'],
  'kojic acid': ['kojic acid', 'brightening', 'dark spots treatment'],
  'aloe vera': ['aloe vera', 'soothing gel', 'sensitive skin', 'cooling'],
  biotin: ['biotin', 'hair growth', 'vitamin B7', 'nail growth'],

  // Rwanda-specific price language
  'igiciro gito': ['affordable', 'cheap', 'budget', 'low cost'],
  cheap: ['affordable', 'budget', 'low price'],
  affordable: ['affordable', 'value', 'budget-friendly'],
  'ibiciro bito': ['low prices', 'affordable range', 'budget beauty'],
  'hejuru gato': ['mid-range', 'medium price', 'moderate cost'],
  'byiza ariko bito': ['good value', 'quality affordable'],

  // Occasion and use searches
  umuganura: ['wedding makeup', 'bridal beauty', 'special occasion'],
  'ibikoresho byo gushana': ['wedding cosmetics', 'bridal kit', 'event makeup'],
  'buri munsi': ['everyday use', 'daily skincare', 'everyday makeup'],
  nijoro: ['night cream', 'bedtime routine', 'overnight treatment'],
  'saa nziza': ['morning routine', 'daytime SPF', 'day cream'],
  'kugira umubiri mwiza': ['body care routine', 'body lotion', 'body oil'],
  'kwitaba ibirori': ['party makeup', 'evening look', 'night out'],

  // Gender-specific searches
  abagabo: ['men', 'mens grooming', 'aftershave', 'mens skincare'],
  "ibikoresho by'abagabo": ["men's products", "men's grooming"],
  "ubuvura bw'abagabo": ["men's skincare", 'men moisturizer'],
  abagore: ['women', 'womens beauty', 'ladies cosmetics'],

  // Product type variations
  'bb cream': ['BB cream', 'tinted moisturizer', 'skin tint'],
  'cc cream': ['CC cream', 'color correcting cream'],
  serum: ['serum', 'face serum', 'treatment', 'ampoule'],
  essence: ['essence', 'toning essence', 'skin prep'],
  primer: ['primer', 'makeup base', 'pore filler'],
  'setting spray': ['setting spray', 'makeup fixer', 'long lasting'],
  contour: ['contour', 'contouring', 'bronzer', 'sculpting'],
  highlight: ['highlighter', 'glow', 'luminizer', 'strobe'],
  'lip liner': ['lip liner', 'lipliner', 'lip contour'],
  'eyebrow pencil': ['eyebrow pencil', 'brow pencil', 'brow gel'],
  blush: ['blush', 'blusher', 'cheek color', 'rouge'],
  bronzer: ['bronzer', 'tan effect', 'sun kissed'],
  'micellar water': ['micellar water', 'makeup remover', 'cleanser'],
  toner: ['toner', 'face toner', 'toneri'],
  exfoliator: ['exfoliator', 'scrub', 'exfoliant', 'peeling'],
  'face mask': ['face mask', 'sheet mask', 'clay mask', 'masque'],
  'eye cream': ['eye cream', 'under eye cream', 'dark circles'],
  'lip balm': ['lip balm', 'chapstick', 'lip moisturizer'],
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
  { pattern: /^(\d+)k\s*(?:rwf|frw)?$/i, parse: (match) => ({ maxPrice: Number.parseInt(match[1], 10) * 1000 }) },
  { pattern: /around\s+(\d+[,.]?\d*)\s*(?:rwf|frw)?/i, parse: (match) => aroundPrice(parseAmount(match[1])) },
  { pattern: /hafi ya\s+(\d+[,.]?\d*)\s*(?:rwf|frw)?/i, parse: (match) => aroundPrice(parseAmount(match[1])) }, // 🔍 REVIEW
  { pattern: /amafaranga make/i, parse: () => ({ maxPrice: 10000 }) }, // 🔍 REVIEW
  { pattern: /amafaranga menshi/i, parse: () => ({ minPrice: 30000 }) }, // 🔍 REVIEW
  { pattern: new RegExp(`(?:under|below|less than)\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ maxPrice: parseAmount(match[1]) }) },
  { pattern: new RegExp(`(?:munsi ya|kutarenza)\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ maxPrice: parseAmount(match[1]) }) }, // 🔍 REVIEW
  { pattern: new RegExp(`(?:between|from)\\s+${amount}\\s*(?:and|to|-)\\s*${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) },
  { pattern: new RegExp(`hagati ya\\s+${amount}\\s+na\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) }, // 🔍 REVIEW
  { pattern: new RegExp(`${amount}\\s*[-–]\\s*${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) },
]

function parseAmount(value: string): number {
  return Number.parseInt(value.replace(/[\s,.]/g, ''), 10)
}

function aroundPrice(value: number): Omit<PriceSearch, 'matchedText'> {
  return {
    minPrice: Math.floor(value * 0.8),
    maxPrice: Math.ceil(value * 1.2),
  }
}

export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const len1 = s1.length
  const len2 = s2.length
  if (len1 === 0 || len2 === 0) return 0
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1
  if (matchDistance < 0) return 0

  const s1Matches = new Array<boolean>(len1).fill(false)
  const s2Matches = new Array<boolean>(len2).fill(false)
  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i += 1) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, len2)
    for (let j = start; j < end; j += 1) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches += 1
      break
    }
  }
  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < len1; i += 1) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k += 1
    if (s1[i] !== s2[k]) transpositions += 1
    k += 1
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
}

export function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2)
  let prefix = 0
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i += 1) {
    if (s1[i] !== s2[i]) break
    prefix += 1
  }
  return jaro + prefix * 0.1 * (1 - jaro)
}

export function expandSearchQuery(query: string): string[] {
  const normalized = query.toLocaleLowerCase('rw-RW').trim().replace(/\s+/g, ' ')
  if (!normalized) return []
  const terms = new Set<string>([normalized])
  const addVocabulary = (localTerm: string, mappedTerms: readonly string[]) => {
    terms.add(localTerm)
    mappedTerms.forEach((term) => terms.add(term.toLocaleLowerCase('rw-RW')))
  }

  // Exact, prefix, and reverse English/local vocabulary matches.
  for (const [localTerm, mappedTerms] of Object.entries(LOCAL_SEARCH_VOCABULARY)) {
    const normalizedMapped = mappedTerms.map((term) => term.toLocaleLowerCase('rw-RW'))
    const localMatch = normalized.includes(localTerm) || (normalized.length >= 3 && localTerm.startsWith(normalized))
    const mappedMatch = normalizedMapped.some((term) => normalized === term || (term.length >= 3 && (normalized.includes(term) || (normalized.length >= 3 && term.startsWith(normalized)))))
    if (localMatch || mappedMatch) addVocabulary(localTerm, mappedTerms)
  }

  // Typo tolerance uses a deliberately high threshold and ignores very short
  // input to avoid broad, expensive, or surprising matches.
  if (normalized.length >= 4) {
    for (const [localTerm, mappedTerms] of Object.entries(LOCAL_SEARCH_VOCABULARY)) {
      const localSimilarity = jaroWinkler(normalized, localTerm)
      const englishMatch = mappedTerms.some((term) => jaroWinkler(normalized, term.toLocaleLowerCase('rw-RW')) >= 0.85)
      if (localSimilarity >= 0.85 || englishMatch) addVocabulary(localTerm, mappedTerms)
    }
  }

  // Keep generated Prisma OR clauses bounded while preserving the original
  // query and the highest-priority exact matches first.
  return [...terms].slice(0, 40)
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

export async function trackZeroResultSearch(
  query: string,
  userId?: string,
  sessionId?: string,
): Promise<void> {
  const normalized = query.trim()
  if (normalized.length < 2) return
  try {
    await fetch('/api/search/track-zero-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: normalized,
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // Search analytics must never interrupt shopping.
  }
}

export function getAlternativeSuggestions(query: string, language: 'en' | 'rw' = 'rw'): string[] {
  const normalized = query.toLocaleLowerCase('rw-RW').trim()
  const categoryMap: Readonly<Record<string, readonly [string, string]>> = {
    skin: ["Ubuvura bw'uruhu", 'skincare products'],
    hair: ["Ubuvura bw'umusatsi", 'hair products'],
    lip: ['Ibikoresho by’iminwa', 'lip products'],
    eye: ['Ibikoresho by’amaso', 'eye makeup'],
    face: ['Ibikoresho byo mu maso', 'face products'],
    body: ['Kwita ku mubiri', 'body care'],
    uruhu: ["Ubuvura bw'uruhu", 'skincare'],
    umusatsi: ["Ubuvura bw'umusatsi", 'hair care'],
    amaso: ['Ibikoresho by’amaso', 'eye makeup'],
    inomo: ['Ibikoresho by’iminwa', 'lip products'],
    umubiri: ['Kwita ku mubiri', 'body care'],
  }
  const alternatives: string[] = []
  for (const [term, labels] of Object.entries(categoryMap)) {
    if (normalized.includes(term)) alternatives.push(language === 'rw' ? labels[0] : labels[1])
  }
  if (alternatives.length === 0) {
    alternatives.push(...(language === 'rw'
      ? ["Ubuvura bw'uruhu", "Ubuvura bw'umusatsi", "Amavuta y'umubiri"]
      : ['Skincare', 'Haircare', 'Body lotion']))
  }
  return [...new Set(alternatives)].slice(0, 4)
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
