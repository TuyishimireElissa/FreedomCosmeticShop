import { z } from 'zod'

/**
 * Pure helpers for the Phase 3 bulk import tool. No server imports, no DB
 * access — the route does the fetching and this file does the deciding, so
 * every rule below is unit-testable.
 *
 * SAFETY MODEL
 * - Only content fields can ever be written (whitelist below). Price, stock,
 *   category, images, flags and every other core field are structurally
 *   impossible to touch through this module.
 * - Nothing is overwritten unless the admin flips `overwrite` on. A field
 *   that already has content is skipped, listed in `skippedFields`, and left
 *   exactly as it is.
 * - An incoming `null` or empty value is treated as "not provided" and never
 *   clears existing content. Clearing a field stays a manual admin action.
 */

/** The one whitelist of importable fields: import key -> DB column. */
export const CONTENT_FIELD_MAP = {
  name: 'name',
  nameRw: 'nameRw',
  shortDescription: 'shortDescription',
  shortDescriptionRw: 'shortDescriptionRw',
  description: 'description',
  descriptionRw: 'descriptionRw',
  ingredients: 'ingredients',
  ingredientsRw: 'ingredientsRw',
  howToUse: 'howToUse',
  howToUseRw: 'howToUseRw',
  expectedResults: 'expectedResults',
  expectedResultsRw: 'expectedResultsRw',
  warnings: 'warnings',
  warningsRw: 'warningsRw',
  suitableFor: 'suitableFor',
  uniqueSellingPoints: 'uniqueSellingPoints',
  seoKeywords: 'seoKeywords',
  seoKeywordsRw: 'seoKeywordsRw',
  whatsappShareText: 'whatsappShareText',
  weight: 'weightGrams',
} as const

export type ImportFieldKey = keyof typeof CONTENT_FIELD_MAP

const MAX_PRODUCTS_PER_BATCH = 500

export const SuitableForSchema = z.object({
  skinType: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  hairType: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  ageRange: z.string().trim().max(50).optional(),
  gender: z.string().trim().max(50).optional(),
}).strict()

export const ImportProductSchema = z.object({
  /** SKU (exact), distributor SKU (exact) or slug (lowercased) — the match key. */
  identifier: z.string().trim().min(1).max(200),
  name: z.string().trim().max(200).optional(),
  nameRw: z.string().trim().max(200).nullable().optional(),
  brand: z.string().trim().max(200).optional(),
  category: z.string().trim().max(200).optional(),
  shortDescription: z.string().trim().max(300).nullable().optional(),
  shortDescriptionRw: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  descriptionRw: z.string().trim().max(5000).nullable().optional(),
  ingredients: z.string().trim().max(5000).nullable().optional(),
  ingredientsRw: z.string().trim().max(5000).nullable().optional(),
  howToUse: z.string().trim().max(5000).nullable().optional(),
  howToUseRw: z.string().trim().max(5000).nullable().optional(),
  expectedResults: z.string().trim().max(5000).nullable().optional(),
  expectedResultsRw: z.string().trim().max(5000).nullable().optional(),
  warnings: z.string().trim().max(3000).nullable().optional(),
  warningsRw: z.string().trim().max(3000).nullable().optional(),
  suitableFor: SuitableForSchema.nullable().optional(),
  uniqueSellingPoints: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  seoKeywords: z.string().trim().max(1000).nullable().optional(),
  seoKeywordsRw: z.string().trim().max(1000).nullable().optional(),
  whatsappShareText: z.string().trim().max(2000).nullable().optional(),
  weight: z.number().int().min(1).max(1_000_000).optional(),
}).strict()

export const BulkImportPayloadSchema = z.object({
  products: z.array(ImportProductSchema).min(1).max(MAX_PRODUCTS_PER_BATCH),
  /** When true the route only reports matches + planned changes, writes nothing. */
  preview: z.boolean().optional().default(false),
  /** When true, non-empty existing content is replaced by the incoming value. */
  overwrite: z.boolean().optional().default(false),
})

export type ImportProduct = z.infer<typeof ImportProductSchema>

export class ImportParseError extends Error {}

/**
 * Parse pasted JSON into the import payload shape.
 * Throws ImportParseError with a readable message on bad input.
 */
export function parseImportJson(text: string): { products: ImportProduct[] } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportParseError('invalid_json')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ImportParseError('expected_object')
  }
  const candidate = (raw as Record<string, unknown>).products ?? raw
  if (!Array.isArray(candidate)) {
    throw new ImportParseError('missing_products')
  }
  if (candidate.length === 0) throw new ImportParseError('empty_products')
  if (candidate.length > MAX_PRODUCTS_PER_BATCH) throw new ImportParseError('too_many_products')
  const products = candidate.map((item, index) => {
    const parsed = ImportProductSchema.safeParse(item)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      const path = first?.path.join('.') || 'payload'
      throw new ImportParseError(`invalid_item:${index}:${path}:${first?.message ?? 'invalid'}`)
    }
    return parsed.data
  })
  return { products }
}

/**
 * "Vitamin C, Glycerin\nAloe Vera" -> ["Vitamin C", "Glycerin", "Aloe Vera"].
 * The legacy `ingredients` column is a JSON array, so the pasted text is
 * split into items the existing tag UI already renders.
 */
export function splitIngredientsText(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100)
}

export function isEmptyString(value: unknown) {
  return value === null || value === undefined || String(value).trim() === ''
}

/** Legacy ingredients column: a JSON string of an array. */
export function ingredientsArrayIsEmpty(raw: unknown) {
  if (isEmptyString(raw)) return true
  try {
    const parsed = JSON.parse(String(raw))
    return !Array.isArray(parsed) || parsed.length === 0
  } catch {
    return false
  }
}

export function isEmptySuitableFor(value: unknown) {
  if (value === null || value === undefined) return true
  if (typeof value !== 'object' || Array.isArray(value)) return true
  return Object.keys(value as Record<string, unknown>).length === 0
}

export function isEmptyWeight(value: unknown) {
  if (value === null || value === undefined) return true
  const asNumber = typeof value === 'number'
    ? value
    : typeof (value as { toNumber?: () => number }).toNumber === 'function'
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value)
  return !Number.isFinite(asNumber) || asNumber <= 0
}

export interface ExistingContentRow {
  [key: string]: unknown
}

export interface ComputedUpdate {
  /** Prisma-ready data object. Empty object = nothing to write. */
  data: Record<string, unknown>
  updatedFields: string[]
  skippedFields: string[]
}

/**
 * Decide, field by field, what a product update would write.
 *
 * `existing` is the raw database row (ingredients still a JSON string,
 * weightGrams still a Decimal). Only CONTENT_FIELD_MAP keys are ever
 * considered, so core fields cannot leak through even with `overwrite`.
 */
export function computeContentUpdate(
  existing: object,
  incoming: ImportProduct,
  overwrite: boolean,
): ComputedUpdate {
  const row = existing as ExistingContentRow
  const data: Record<string, unknown> = {}
  const updatedFields: string[] = []
  const skippedFields: string[] = []

  const consider = (key: ImportFieldKey, next: unknown, currentIsEmpty: boolean, currentRaw?: unknown) => {
    if (next === null || next === undefined) return
    if (key === 'weight') {
      if (isEmptyWeight(next)) return
      const grams = Math.round(Number(next))
      if (currentIsEmpty || overwrite) {
        data.weightGrams = grams
        updatedFields.push(key)
      } else {
        skippedFields.push(key)
      }
      return
    }
    if (key === 'ingredients') {
      const items = splitIngredientsText(String(next))
      if (items.length === 0) return
      if (currentIsEmpty || overwrite) {
        data.ingredients = JSON.stringify(items)
        updatedFields.push(key)
      } else {
        skippedFields.push(key)
      }
      return
    }
    if (key === 'uniqueSellingPoints') {
      const items = (Array.isArray(next) ? next : []).map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
      if (items.length === 0) return
      if (currentIsEmpty || overwrite) {
        data.uniqueSellingPoints = items
        updatedFields.push(key)
      } else {
        skippedFields.push(key)
      }
      return
    }
    if (key === 'suitableFor') {
      if (!next || typeof next !== 'object' || Object.keys(next as Record<string, unknown>).length === 0) return
      if (currentIsEmpty || overwrite) {
        data.suitableFor = next
        updatedFields.push(key)
      } else {
        skippedFields.push(key)
      }
      return
    }
    // Plain strings.
    const value = String(next).trim()
    if (!value) return
    if (currentIsEmpty || overwrite) {
      data[key] = value
      updatedFields.push(key)
    } else {
      skippedFields.push(key)
    }
  }

  const column = (key: ImportFieldKey) => row[CONTENT_FIELD_MAP[key]]

  consider('name', incoming.name, isEmptyString(column('name')))
  consider('nameRw', incoming.nameRw, isEmptyString(column('nameRw')))
  consider('shortDescription', incoming.shortDescription, isEmptyString(column('shortDescription')))
  consider('shortDescriptionRw', incoming.shortDescriptionRw, isEmptyString(column('shortDescriptionRw')))
  consider('description', incoming.description, isEmptyString(column('description')))
  consider('descriptionRw', incoming.descriptionRw, isEmptyString(column('descriptionRw')))
  consider('ingredients', incoming.ingredients, ingredientsArrayIsEmpty(column('ingredients')))
  consider('ingredientsRw', incoming.ingredientsRw, isEmptyString(column('ingredientsRw')))
  consider('howToUse', incoming.howToUse, isEmptyString(column('howToUse')))
  consider('howToUseRw', incoming.howToUseRw, isEmptyString(column('howToUseRw')))
  consider('expectedResults', incoming.expectedResults, isEmptyString(column('expectedResults')))
  consider('expectedResultsRw', incoming.expectedResultsRw, isEmptyString(column('expectedResultsRw')))
  consider('warnings', incoming.warnings, isEmptyString(column('warnings')))
  consider('warningsRw', incoming.warningsRw, isEmptyString(column('warningsRw')))
  consider('suitableFor', incoming.suitableFor, isEmptySuitableFor(column('suitableFor')))
  consider('uniqueSellingPoints', incoming.uniqueSellingPoints, !Array.isArray(column('uniqueSellingPoints')) || (column('uniqueSellingPoints') as unknown[]).length === 0)
  consider('seoKeywords', incoming.seoKeywords, isEmptyString(column('seoKeywords')))
  consider('seoKeywordsRw', incoming.seoKeywordsRw, isEmptyString(column('seoKeywordsRw')))
  consider('whatsappShareText', incoming.whatsappShareText, isEmptyString(column('whatsappShareText')))
  consider('weight', incoming.weight, isEmptyWeight(column('weight')))

  return { data, updatedFields, skippedFields }
}
