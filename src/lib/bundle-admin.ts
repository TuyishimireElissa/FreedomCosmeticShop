import { BundleType } from '@prisma/client'
import { z } from 'zod'

export const BundleInputSchema = z.object({
  name: z.string().trim().min(2).max(200), nameRw: z.string().trim().max(200).optional().nullable(), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(3000).optional().nullable(), descriptionRw: z.string().trim().max(3000).optional().nullable(), bundleType: z.nativeEnum(BundleType),
  bundlePrice: z.number().int().min(0), coverImage: z.string().trim().max(500).optional().nullable(), coverImageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true), isFeatured: z.boolean().default(false), targetConcern: z.string().trim().max(100).optional().nullable(), targetSkinType: z.string().trim().max(50).optional().nullable(), targetHairType: z.string().trim().max(50).optional().nullable(), targetCategory: z.string().trim().max(100).optional().nullable(),
  usageInstructions: z.string().trim().max(5000).optional().nullable(), usageInstructionsRw: z.string().trim().max(5000).optional().nullable(),
  products: z.array(z.object({ productId: z.string().min(1), stepOrder: z.number().int().min(0), stepLabel: z.string().trim().max(200).optional().nullable(), stepLabelRw: z.string().trim().max(200).optional().nullable(), quantity: z.number().int().min(1).max(20), isOptional: z.boolean().default(false) })).min(1).max(20),
}).superRefine((data, context) => { const ids = data.products.map((item) => item.productId); if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['products'], message: 'A product can appear only once' }) })
