/** FreedomCosmeticShop quiz logic — never contains product or bundle IDs. */

export type QuizCategory = 'skin' | 'hair' | 'makeup'
export type BudgetRange = 'under5k' | '5k-15k' | '15k-50k' | '50k+'
export type SensitivityLevel = 'none' | 'some' | 'high'

export interface QuizAnswers {
  category: QuizCategory
  mainConcern: string
  skinType?: string
  hairType?: string
  preferredResult: string
  budget: BudgetRange
  sensitivity: SensitivityLevel
}

export const BUDGET_RANGES: Record<BudgetRange, { min: number; max?: number; translationKey: string }> = {
  under5k: { min: 0, max: 5000, translationKey: 'quiz.budget_under5k' },
  '5k-15k': { min: 5000, max: 15000, translationKey: 'quiz.budget_5k_15k' },
  '15k-50k': { min: 15000, max: 50000, translationKey: 'quiz.budget_15k_50k' },
  '50k+': { min: 50000, translationKey: 'quiz.budget_50k_plus' },
}

const CONCERN_TERMS: Record<QuizCategory, Record<string, string[]>> = {
  skin: {
    acne: ['acne', 'blemish', 'salicylic acid', 'tea tree', 'oil control'],
    dark_spots: ['brightening', 'dark spots', 'vitamin c', 'kojic acid', 'niacinamide'],
    dryness: ['moisturizer', 'hydrating', 'dry skin', 'shea butter', 'hyaluronic acid'],
    oiliness: ['oil control', 'mattifying', 'oily skin', 'salicylic acid', 'clay'],
    aging: ['anti-aging', 'retinol', 'firming', 'collagen', 'peptides'],
    sensitivity: ['sensitive skin', 'soothing', 'gentle', 'ceramides'],
    uneven_tone: ['brightening', 'even tone', 'vitamin c', 'niacinamide'],
    pores: ['pore minimizer', 'niacinamide', 'salicylic acid', 'clay mask', 'toner'],
    glow: ['glow', 'radiance', 'brightening', 'vitamin c', 'face oil'],
  },
  hair: {
    hair_loss: ['hair growth', 'hair loss', 'biotin', 'castor oil', 'strengthening'],
    dandruff: ['dandruff', 'scalp', 'tea tree', 'scalp care'],
    dryness: ['hair moisturizer', 'deep conditioner', 'dry hair', 'hair butter', 'argan oil'],
    breakage: ['strengthening', 'protein treatment', 'breakage', 'keratin'],
    growth: ['hair growth', 'castor oil', 'biotin', 'growth serum'],
    frizz: ['frizz control', 'smoothing', 'anti-frizz', 'serum'],
    relaxer: ['relaxer', 'straightening', 'smoothing treatment'],
    natural: ['natural hair', 'define curls', 'moisturizing', 'leave-in'],
    color: ['hair color', 'hair dye', 'color treatment'],
  },
  makeup: {
    coverage: ['foundation', 'full coverage', 'concealer'],
    natural_look: ['bb cream', 'tinted moisturizer', 'natural makeup'],
    long_lasting: ['setting spray', 'primer', 'long lasting', 'waterproof'],
    eyes: ['mascara', 'eyeliner', 'eyeshadow', 'eye makeup'],
    lips: ['lipstick', 'lip gloss', 'lip liner', 'lip balm'],
    glow: ['highlighter', 'glow', 'luminizer', 'bronzer'],
    everyday: ['everyday makeup', 'light coverage', 'natural finish'],
  },
}

const RESULT_TERMS: Record<QuizCategory, Record<string, string[]>> = {
  skin: {
    clear_skin: ['acne', 'blemish', 'oil control'],
    bright_skin: ['brightening', 'glow', 'vitamin c'],
    moisturized: ['moisturizer', 'hydrating', 'nourishing'],
    even_tone: ['even tone', 'brightening', 'niacinamide'],
    youthful: ['anti-aging', 'firming', 'retinol'],
    smooth: ['exfoliating', 'smooth skin', 'gentle'],
  },
  hair: {
    long_strong: ['hair growth', 'strengthening', 'length retention'],
    moisturized_soft: ['moisturizing', 'deep conditioner', 'soft hair'],
    smooth_shiny: ['smooth hair', 'shiny hair', 'frizz control', 'serum'],
    defined_curls: ['curl defining', 'natural hair', 'curl cream'],
    clean_scalp: ['scalp treatment', 'dandruff', 'scalp care'],
  },
  makeup: {
    everyday_look: ['everyday makeup', 'natural makeup'],
    full_glam: ['full coverage', 'long lasting'],
    office_look: ['natural finish', 'long lasting'],
    glowing_skin: ['glow', 'highlighter', 'luminizer'],
  },
}

export function buildRecommendationQuery(answers: QuizAnswers) {
  const price = BUDGET_RANGES[answers.budget]
  const searchTerms = new Set([
    ...(CONCERN_TERMS[answers.category][answers.mainConcern] || []),
    ...(RESULT_TERMS[answers.category][answers.preferredResult] || []),
  ])
  if (answers.sensitivity !== 'none') ['gentle', 'sensitive skin', 'soothing'].forEach((term) => searchTerms.add(term))
  return {
    searchTerms: [...searchTerms],
    skinType: answers.skinType,
    hairType: answers.hairType,
    category: answers.category === 'skin' ? 'skincare' : answers.category === 'hair' ? 'haircare' : 'makeup',
    minPrice: price.min > 0 ? price.min : undefined,
    maxPrice: price.max,
    excludeRecordedAllergens: answers.sensitivity === 'high',
  }
}

export interface QuizOption {
  value: string
  labelKey: string
  icon: string
}

export interface QuizStep {
  id: keyof QuizAnswers
  questionKey: string
  subtitleKey?: string
  options: QuizOption[]
}

export const CATEGORY_OPTIONS: QuizOption[] = [
  { value: 'skin', labelKey: 'quiz.category_skin', icon: '🧴' },
  { value: 'hair', labelKey: 'quiz.category_hair', icon: '💇' },
  { value: 'makeup', labelKey: 'quiz.category_makeup', icon: '💄' },
]

export const CONCERN_OPTIONS: Record<QuizCategory, QuizOption[]> = {
  skin: ['acne', 'dark_spots', 'dryness', 'oiliness', 'aging', 'uneven_tone', 'pores', 'glow', 'sensitivity'].map((value) => ({ value, labelKey: `quiz.concern_skin_${value}`, icon: '🌸' })),
  hair: ['hair_loss', 'dryness', 'dandruff', 'growth', 'breakage', 'frizz', 'relaxer', 'natural', 'color'].map((value) => ({ value, labelKey: `quiz.concern_hair_${value}`, icon: '🌿' })),
  makeup: ['coverage', 'natural_look', 'long_lasting', 'eyes', 'lips', 'glow', 'everyday'].map((value) => ({ value, labelKey: `quiz.concern_makeup_${value}`, icon: '✨' })),
}

export const SKIN_TYPE_OPTIONS: QuizOption[] = ['OILY', 'DRY', 'COMBINATION', 'NORMAL', 'SENSITIVE'].map((value) => ({ value, labelKey: `skin_types.${value}`, icon: '🧴' }))
export const HAIR_TYPE_OPTIONS: QuizOption[] = ['NATURAL', 'RELAXED', 'WAVY', 'CURLY', 'COILY', 'ALL_HAIR'].map((value) => ({ value, labelKey: `hair_types.${value}`, icon: '💇' }))

export const RESULT_OPTIONS: Record<QuizCategory, QuizOption[]> = {
  skin: ['clear_skin', 'bright_skin', 'moisturized', 'even_tone', 'youthful', 'smooth'].map((value) => ({ value, labelKey: `quiz.result_skin_${value}`, icon: '✨' })),
  hair: ['long_strong', 'moisturized_soft', 'smooth_shiny', 'defined_curls', 'clean_scalp'].map((value) => ({ value, labelKey: `quiz.result_hair_${value}`, icon: '🌿' })),
  makeup: ['everyday_look', 'full_glam', 'office_look', 'glowing_skin'].map((value) => ({ value, labelKey: `quiz.result_makeup_${value}`, icon: '💄' })),
}

export const BUDGET_OPTIONS: QuizOption[] = (Object.keys(BUDGET_RANGES) as BudgetRange[]).map((value) => ({ value, labelKey: BUDGET_RANGES[value].translationKey, icon: '💰' }))
export const SENSITIVITY_OPTIONS: QuizOption[] = ['none', 'some', 'high'].map((value) => ({ value, labelKey: `quiz.sensitivity_${value}`, icon: value === 'none' ? '✅' : '🌸' }))

export function getQuizStep(step: number, answers: Partial<QuizAnswers>): QuizStep {
  const category = answers.category || 'skin'
  if (step === 1) return { id: 'category', questionKey: 'quiz.question_category', subtitleKey: 'quiz.subtitle_category', options: CATEGORY_OPTIONS }
  if (step === 2) return { id: 'mainConcern', questionKey: `quiz.question_concern_${category}`, options: CONCERN_OPTIONS[category] }
  if (step === 3) return category === 'hair'
    ? { id: 'hairType', questionKey: 'quiz.question_hair_type', options: HAIR_TYPE_OPTIONS }
    : { id: 'skinType', questionKey: 'quiz.question_skin_type', options: SKIN_TYPE_OPTIONS }
  if (step === 4) return { id: 'preferredResult', questionKey: 'quiz.question_result', options: RESULT_OPTIONS[category] }
  if (step === 5) return { id: 'budget', questionKey: 'quiz.question_budget', subtitleKey: 'quiz.subtitle_budget', options: BUDGET_OPTIONS }
  return { id: 'sensitivity', questionKey: 'quiz.question_sensitivity', subtitleKey: 'quiz.subtitle_sensitivity', options: SENSITIVITY_OPTIONS }
}
