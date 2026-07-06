/**
 * Centralized environment variable validation.
 *
 * This file validates that all required environment variables are present
 * at startup, so the app fails fast with a clear error message instead of
 * crashing mysteriously later.
 *
 * Usage:
 *   import { env } from "@/lib/env"
 *   console.log(env.DATABASE_URL)
 *
 * In development, missing optional vars are silently allowed.
 * In production, missing required vars throw an error.
 */

import { z } from "zod"

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_NAME: z.string().default("Ubumwe Beauty"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // PayPack (MTN MoMo)
  PAYPACK_CLIENT_ID: z.string().optional(),
  PAYPACK_CLIENT_SECRET: z.string().optional(),
  PAYPACK_ENVIRONMENT: z.enum(["production", "sandbox"]).default("sandbox"),
  PAYPACK_WEBHOOK_URL: z.string().url().optional(),

  // Flutterwave
  FLW_PUBLIC_KEY: z.string().optional(),
  FLW_SECRET_KEY: z.string().optional(),
  FLW_ENCRYPTION_KEY: z.string().optional(),
  FLW_WEBHOOK_HASH: z.string().optional(),
  FLW_WEBHOOK_URL: z.string().url().optional(),

  // Africa's Talking (SMS)
  AT_USERNAME: z.string().optional(),
  AT_API_KEY: z.string().optional(),
  AT_SENDER_ID: z.string().max(11).optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // Algolia
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_ADMIN_API_KEY: z.string().optional(),
  ALGOLIA_SEARCH_API_KEY: z.string().optional(),
  ALGOLIA_INDEX_NAME: z.string().default("ubumwe_products"),

  // Redis
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),

  // Admin
  ADMIN_EMAILS: z.string().default(""),
  ADMIN_ACCESS_KEY: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(60),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Feature flags
  ENABLE_SMS_NOTIFICATIONS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_EMAIL_NOTIFICATIONS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_REAL_PAYMENTS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_SEARCH_INDEXING: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_REDIS_CACHE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
})

export type Env = z.infer<typeof envSchema>

/**
 * Parsed & validated environment variables.
 *
 * Throws a clear error if required vars are missing in production.
 */
function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    // In production, fail hard. In development, log warnings & use defaults.
    if (process.env.NODE_ENV === "production") {
      console.error("❌ Invalid environment variables:")
      console.error(parsed.error.flatten().fieldErrors)
      throw new Error("Invalid environment variables. See logs above.")
    } else {
      console.warn("⚠️  Some environment variables are missing or invalid:")
      console.warn(parsed.error.flatten().fieldErrors)
      // Use whatever we can parse (partial)
      return envSchema.parse({
        ...process.env,
        // Force-allow undefined optionals in dev
      })
    }
  }
  return parsed.data
}

export const env = loadEnv()

/**
 * Convenience helpers for feature flags.
 */
export const features = {
  sms: env.ENABLE_SMS_NOTIFICATIONS,
  email: env.ENABLE_EMAIL_NOTIFICATIONS,
  realPayments: env.ENABLE_REAL_PAYMENTS,
  searchIndexing: env.ENABLE_SEARCH_INDEXING,
  redisCache: env.ENABLE_REDIS_CACHE,
} as const
