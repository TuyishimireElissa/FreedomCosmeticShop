/**
 * Centralized environment variable validation for FreedomCosmeticShop
 * Rwanda E-Commerce - RWF, MTN MoMo, Supabase, Cloudinary
 */

import { z } from "zod"

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_NAME: z.string().default("FreedomCosmeticShop"),
  APP_URL: z.string().url().default("https://freedom-cosmetic-shop.vercel.app"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("FreedomCosmeticShop"),

  // Store
  STORE_NAME: z.string().default("FreedomCosmeticShop"),
  STORE_CURRENCY: z.string().default("RWF"),
  STORE_TIMEZONE: z.string().default("Africa/Kigali"),
  NEXT_PUBLIC_CURRENCY: z.string().default("RWF"),
  NEXT_PUBLIC_COUNTRY: z.string().default("Rwanda"),
  NEXT_PUBLIC_WHATSAPP: z.string().default("+250780000000"),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),

  // Database - Supabase PostgreSQL
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PROJECT_REF: z.string().default("hsdqahltrqjeaskhheis"),

  // Auth
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),

  // PayPack (MTN MoMo)
  PAYPACK_CLIENT_ID: z.string().optional(),
  PAYPACK_CLIENT_SECRET: z.string().optional(),
  PAYPACK_WEBHOOK_SECRET: z.string().optional(),
  PAYPACK_ENVIRONMENT: z.enum(["production", "sandbox"]).default("sandbox"),
  PAYPACK_WEBHOOK_URL: z.string().url().optional(),

  // Flutterwave
  FLW_PUBLIC_KEY: z.string().optional(),
  FLW_SECRET_KEY: z.string().optional(),
  FLW_ENCRYPTION_KEY: z.string().optional(),
  FLW_WEBHOOK_HASH: z.string().optional(),
  FLW_WEBHOOK_URL: z.string().url().optional(),

  // SMS
  AT_USERNAME: z.string().optional(),
  AT_API_KEY: z.string().optional(),
  PINDO_API_KEY: z.string().optional(),
  AT_SENDER_ID: z.string().max(11).optional(),

  // Cloudinary - dohoc0tmp
  CLOUDINARY_CLOUD_NAME: z.string().default("dohoc0tmp"),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().default("freedom_uploads"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().default("dohoc0tmp"),

  // Algolia (optional)
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_ADMIN_API_KEY: z.string().optional(),
  ALGOLIA_SEARCH_API_KEY: z.string().optional(),
  ALGOLIA_INDEX_NAME: z.string().default("freedom_products"),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email (optional)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),

  // Admin
  ADMIN_EMAILS: z.string().default(""),
  ADMIN_ACCESS_KEY: z.string().optional(),

  // Feature flags
  ALLOW_SEED: z.string().default("false"),
  ENABLE_SMS_NOTIFICATIONS: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  ENABLE_EMAIL_NOTIFICATIONS: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  ENABLE_REAL_PAYMENTS: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  ENABLE_SEARCH_INDEXING: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  ENABLE_REDIS_CACHE: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  try {
    const parsed = envSchema.safeParse(process.env)
    if (!parsed.success) {
      if (process.env.NODE_ENV === "production") {
        console.warn("  Env validation warnings (non-blocking):", parsed.error.flatten().fieldErrors)
        // Don't throw in production to allow fallback data to work
        return {
          NODE_ENV: "production" as const,
          APP_NAME: "FreedomCosmeticShop",
          APP_URL: "https://freedom-cosmetic-shop.vercel.app",
          DATABASE_URL: process.env.DATABASE_URL || "postgresql://placeholder",
          DIRECT_URL: process.env.DIRECT_URL,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_PROJECT_REF: "hsdqahltrqjeaskhheis",
          CLOUDINARY_CLOUD_NAME: "dohoc0tmp",
          NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "dohoc0tmp",
          CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
          CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
          CLOUDINARY_UPLOAD_PRESET: "freedom_uploads",
          STORE_NAME: "FreedomCosmeticShop",
          STORE_CURRENCY: "RWF",
          STORE_TIMEZONE: "Africa/Kigali",
          NEXT_PUBLIC_CURRENCY: "RWF",
          NEXT_PUBLIC_WHATSAPP: "+250780000000",
          ALGOLIA_INDEX_NAME: "freedom_products",
          PAYPACK_ENVIRONMENT: "sandbox" as const,
          ADMIN_EMAILS: "",
          ALLOW_SEED: "false",
          ENABLE_SMS_NOTIFICATIONS: false,
          ENABLE_EMAIL_NOTIFICATIONS: false,
          ENABLE_REAL_PAYMENTS: false,
          ENABLE_SEARCH_INDEXING: false,
          ENABLE_REDIS_CACHE: false,
        } as unknown as Env
      } else {
        console.warn("  Env validation warnings:", parsed.error.flatten().fieldErrors)
        return envSchema.parse({ ...process.env })
      }
    }
    return parsed.data
  } catch {
    return {
      NODE_ENV: "development" as const,
      APP_NAME: "FreedomCosmeticShop",
      APP_URL: "http://localhost:3000",
      DATABASE_URL: process.env.DATABASE_URL || "file:./db/custom.db",
      CLOUDINARY_CLOUD_NAME: "dohoc0tmp",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "dohoc0tmp",
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      CLOUDINARY_UPLOAD_PRESET: "freedom_uploads",
      ALGOLIA_INDEX_NAME: "freedom_products",
      PAYPACK_ENVIRONMENT: "sandbox" as const,
      ADMIN_EMAILS: "",
      ALLOW_SEED: "false",
      ENABLE_SMS_NOTIFICATIONS: false,
      ENABLE_EMAIL_NOTIFICATIONS: false,
      ENABLE_REAL_PAYMENTS: false,
      ENABLE_SEARCH_INDEXING: false,
      ENABLE_REDIS_CACHE: false,
    } as unknown as Env
  }
}

export const env = loadEnv()

export const features = {
  sms: env.ENABLE_SMS_NOTIFICATIONS,
  email: env.ENABLE_EMAIL_NOTIFICATIONS,
  realPayments: env.ENABLE_REAL_PAYMENTS,
  searchIndexing: env.ENABLE_SEARCH_INDEXING,
  redisCache: env.ENABLE_REDIS_CACHE,
} as const
