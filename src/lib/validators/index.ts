/**
 * Shared Zod validation schemas for client + server.
 *
 * Usage:
 *   import { createOrderSchema } from "@/lib/validators/order"
 *   const parsed = createOrderSchema.safeParse(body)
 */

import { z } from "zod"
import {
  PATTERNS,
  LIMITS,
  RWANDAN_PROVINCES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "@/lib/constants"

// ─── Product ─────────────────────────────────────────────────────────────────

export const productSlugSchema = z.string().min(1).regex(PATTERNS.slug, "Invalid slug")

export const createProductSchema = z.object({
  name: z.string().min(2).max(LIMITS.productName),
  description: z.string().min(10).max(LIMITS.productDescription),
  price: z.number().int().min(0, "Price must be a positive integer"),
  compareAt: z.number().int().min(0).optional().nullable(),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  stock: z.number().int().min(0).default(0),
  sku: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  categoryId: z.string().min(1),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()
export type UpdateProductInput = z.infer<typeof updateProductSchema>

// ─── Order ───────────────────────────────────────────────────────────────────

export const createOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
})

export const createOrderSchema = z.object({
  customerName: z.string().min(2, "Name is too short").max(LIMITS.customerName),
  customerPhone: z
    .string()
    .min(9, "Phone number is too short")
    .max(LIMITS.customerPhone)
    .regex(PATTERNS.rwandanPhone, "Enter a valid Rwandan phone (e.g. 0788 123 456)"),
  customerEmail: z
    .string()
    .max(LIMITS.customerEmail)
    .regex(PATTERNS.email, "Invalid email")
    .optional()
    .or(z.literal("")),
  address: z.string().min(5, "Address is too short").max(LIMITS.address),
  city: z.string().min(2).max(LIMITS.city),
  province: z.enum(RWANDAN_PROVINCES),
  notes: z.string().max(LIMITS.orderNotes).optional(),
  paymentMethod: z.enum(["MTN_MOMO", "COD"]),
  items: z
    .array(createOrderItemSchema)
    .min(1, "Cart cannot be empty")
    .max(50, "Too many items in cart"),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

// ─── Order status update ────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

// ─── Category ────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(PATTERNS.slug),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().nullable(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

// ─── User (for future auth) ──────────────────────────────────────────────────

export const signUpSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(PATTERNS.rwandanPhone, "Invalid Rwandan phone"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type SignInInput = z.infer<typeof signInSchema>
