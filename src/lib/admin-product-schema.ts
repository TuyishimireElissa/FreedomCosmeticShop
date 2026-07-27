import { z } from 'zod'

export const CreateProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().default(''),
  shortDescription: z.string().trim().max(300).optional().nullable(),
  price: z.number().finite().int().positive(),
  wholesalePrice: z.number().finite().int().positive().optional().nullable(),
  compareAt: z.number().finite().int().min(0).optional().nullable(),
  stock: z.number().finite().int().min(0).max(10_000_000).default(0),
  lowStockThreshold: z.number().finite().int().min(0).max(1_000_000).default(5),
  sku: z.string().trim().max(100).optional().nullable(),
  realSku: z.string().trim().max(100).optional().nullable(),
  costPrice: z.number().finite().int().min(0).optional().nullable(),
  supplierId: z.string().trim().min(1).max(100).optional().nullable(),
  manufacturedDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  periodAfterOpening: z.number().finite().int().min(1).max(120).optional().nullable(),
  batchNumber: z.string().trim().max(100).optional().nullable(),
  volume: z.string().trim().max(100).optional().nullable(),
  brandId: z.string().trim().min(1).max(100).optional().nullable(),
  categoryId: z.string().trim().min(1).max(100),
  images: z.array(z.string().url().refine((value) => value.startsWith('https://'), 'Image URL must use HTTPS')).max(5).optional().default([]),
  skinType: z.array(z.string().trim().min(1).max(50)).max(10).optional().nullable(),
  shades: z.array(z.string().trim().min(1).max(100)).max(100).optional().nullable(),
  ingredients: z.array(z.string().trim().min(1).max(200)).max(100).optional().nullable(),
  size: z.string().trim().max(100).optional().nullable(),
  usageInstructions: z.string().trim().max(3000).optional().nullable(),
  warnings: z.string().trim().max(3000).optional().nullable(),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).strict().superRefine((value, ctx) => {
  if (value.compareAt !== null && value.compareAt !== undefined && value.compareAt !== 0 && value.compareAt <= value.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['compareAt'], message: 'Compare-at price must be greater than the selling price' })
  }
  if (value.wholesalePrice !== null && value.wholesalePrice !== undefined && value.wholesalePrice > value.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['wholesalePrice'], message: 'Wholesale price cannot exceed the retail price' })
  }
  if (value.manufacturedDate && value.expiryDate && new Date(value.expiryDate) <= new Date(value.manufacturedDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expiryDate'], message: 'Expiry date must be after the manufactured date' })
  }
})
