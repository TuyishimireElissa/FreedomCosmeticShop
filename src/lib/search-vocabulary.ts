/**
 * Rwanda cosmetics local-search vocabulary.
 *
 *  REVIEW: Kinyarwanda vocabulary must be reviewed by a fluent speaker and
 * local cosmetics retailer before production search analytics are finalized.
 */

export const LOCAL_SEARCH_VOCABULARY: Readonly<Record<string, readonly string[]>> = {
  // Broad categories —  REVIEW
  uruhu: ['skincare', 'skin care', 'skin', 'face cream'],
  'kwita ku ruhu': ['skincare', 'skin care', 'face care'],
  umusatsi: ['haircare', 'hair care', 'hair'],
  'kwita ku musatsi': ['haircare', 'hair treatment'],
  kwisiga: ['makeup', 'cosmetics'],
  'ibikoresho byo kwisiga': ['makeup', 'cosmetics'],
  imibavu: ['fragrance', 'perfume'],
  umubiri: ['body care', 'body lotion', 'body'],
  'kwita ku mubiri': ['body care', 'body lotion'],
  // Kinyarwanda spelling of the Deodorante category tile. Without this,
  // typing the label shown in the menu returned 0 of 3 deodorants.
  deodorante: ['deodorant', 'body spray', 'roll-on', 'antiperspirant'],
  ifarasi: ['nail care', 'nail polish', 'manicure', 'nails'],

  // Common product language —  REVIEW
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

  // Customer needs —  REVIEW
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
  /**
   * The words printed on our own category tiles must be searchable.
   *
   * `Kwera no Kurangaza` is the Kinyarwanda label a shopper reads in the
   * menu. Typing what they just read returned **0 of 9 whitening products**,
   * because no vocabulary entry existed for it. The same was true of
   * `Deodorante` below. A customer who copies your own navigation and finds
   * nothing is the worst possible search result.
   */
  kwera: ['whitening', 'brightening', 'lightening', 'glowing', 'fairness'],
  kurangaza: ['brightening', 'glowing', 'radiance', 'whitening'],
  'kwera no kurangaza': ['whitening', 'brightening', 'lightening'],
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

  /**
   * Children. MUST be an explicit key, not left to fuzzy matching.
   *
   * `abana` (children) scores 0.8533 against `abagabo` (men) on
   * Jaro-Winkler, just over the 0.85 typo threshold. With no entry of its
   * own, a search for baby products expanded to men's grooming and returned
   * deodorant and men's soap — the opposite audience. An exact key wins
   * before fuzzy matching runs, so this fixes it without touching the
   * threshold, which protects genuine typo recall elsewhere.
   */
  abana: ['baby', 'kids', 'children', 'baby care', 'baby lotion', 'baby oil'],
  "ibikoresho by'abana": ['baby products', 'kids products'],

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
  { pattern: /hafi ya\s+(\d+[,.]?\d*)\s*(?:rwf|frw)?/i, parse: (match) => aroundPrice(parseAmount(match[1])) }, //  REVIEW
  { pattern: /amafaranga make/i, parse: () => ({ maxPrice: 10000 }) }, //  REVIEW
  { pattern: /amafaranga menshi/i, parse: () => ({ minPrice: 30000 }) }, //  REVIEW
  { pattern: new RegExp(`(?:under|below|less than)\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ maxPrice: parseAmount(match[1]) }) },
  { pattern: new RegExp(`(?:munsi ya|kutarenza)\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ maxPrice: parseAmount(match[1]) }) }, //  REVIEW
  { pattern: new RegExp(`(?:between|from)\\s+${amount}\\s*(?:and|to|-)\\s*${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) },
  { pattern: new RegExp(`hagati ya\\s+${amount}\\s+na\\s+${amount}\\s*(?:rwf|frw|rw)?`, 'i'), parse: (match) => ({ minPrice: parseAmount(match[1]), maxPrice: parseAmount(match[2]) }) }, //  REVIEW
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

  /**
   * Typo tolerance, but only for words we do not already recognise.
   *
   * Fuzzy matching used to run even when the query was an exact vocabulary
   * key, which produced actively wrong results for near-miss pairs:
   * `abana` (children) scores **0.8533** against `abagabo` (men), over the
   * 0.85 threshold, so a search for baby products also pulled in men's
   * grooming and returned deodorant and men's soap.
   *
   * Source-gated: if the shopper typed a word we know, they meant that word,
   * and guessing at neighbours can only add noise. Typo correction still runs
   * for everything else, so recall for genuine misspellings is unchanged —
   * `vitanin` still finds vitamin products.
   */
  const isKnownExactly = Object.prototype.hasOwnProperty.call(LOCAL_SEARCH_VOCABULARY, normalized)

  if (!isKnownExactly && normalized.length >= 4) {
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

/**
 * Controlled vocabulary for popular-search reporting — owner-supplied.
 *
 * WHY A FIXED LIST. Customer search text may contain names, phone numbers or
 * addresses, so `recordSearch` stores only an HMAC of the query and the raw
 * text is unrecoverable by design. That privacy model is deliberate and is not
 * being weakened. The consequence is that "what did people search for?" cannot
 * be answered by reading the log back.
 *
 * A controlled vocabulary answers it without storing free text: when a query
 * contains one of these known catalogue words, the WORD — not the query — is
 * recorded alongside the hash. "12 people searched sunscreen" becomes
 * answerable; "who searched for Mukamana" stays permanently unanswerable.
 *
 * Anything a shopper types that is not on this list is simply not counted.
 * That is the trade, and it is the safe direction to fail in.
 */
export const CONTROLLED_SEARCH_VOCABULARY = [
  // Kinyarwanda
  'isabune', 'amavuta', 'seramu', 'imibavu', 'umusatsi', 'uruhu',
  'ibikoresho', 'kwera', 'umubiri', 'abana', 'ifarasi', 'deodorante',
  // English — product types
  'soap', 'lotion', 'cream', 'perfume', 'oil', 'serum', 'shampoo',
  'moisturizer', 'toner', 'cleanser', 'scrub', 'mask', 'gel', 'sunscreen',
  'vaseline', 'deodorant',
  // English — body areas and outcomes
  'hair', 'skin', 'body', 'face', 'whitening', 'brightening', 'glowing',
  'anti-aging', 'baby',
  // Brands
  'dettol', 'johnson', 'dove', 'kojic',
  // Ingredients
  'vitamin c', 'retinol', 'collagen', 'aloe vera', 'shea butter',
  'coconut oil', 'castor oil', 'argan oil', 'rose water', 'charcoal',
  'turmeric',
] as const

export type ControlledSearchTerm = (typeof CONTROLLED_SEARCH_VOCABULARY)[number]

/**
 * The controlled term a query refers to, or null.
 *
 * Longest match first, so "coconut oil" is not reported as the far broader
 * "oil", and "vitamin c" is not lost to a bare token match. Word-boundary
 * matched so "soap" does not fire on "soapstone" and, more importantly, a
 * short term cannot match inside an unrelated word a customer typed.
 */
export function matchControlledTerm(query: string): ControlledSearchTerm | null {
  const haystack = ` ${query.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim()} `
  if (haystack.trim().length === 0) return null

  const byLength = [...CONTROLLED_SEARCH_VOCABULARY].sort((left, right) => right.length - left.length)
  for (const term of byLength) {
    if (haystack.includes(` ${term} `)) return term
  }
  return null
}
