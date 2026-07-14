/**
 * Permission enforcement + rate limiting for admin actions.
 *
 * Section 11: Security & Access Control
 *
 * requirePermission() builds on requireRole() to add fine-grained
 * permission checking based on the user's StaffProfile.permissions array.
 *
 * Rate limiting uses a simple in-memory token bucket per user+action.
 * For multi-process deployments, you'd use Redis instead.
 */

import { requireRole, type AuthUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { AuthError } from "@/lib/auth"

// ─── Permission definitions ──────────────────────────────────────────────────

/**
 * Permission keys — must match the keys in StaffProfile.permissions JSON
 * and the PERMISSION_GROUPS in AdminStaff.tsx
 */
export const PERMISSIONS = {
  // Orders
  ORDERS_READ: "orders.read",
  ORDERS_UPDATE: "orders.update",
  ORDERS_REFUND: "orders.refund",
  // Products
  PRODUCTS_READ: "products.read",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_CRUD: "products.crud",
  // Customers
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_UPDATE: "customers.update",
  CUSTOMERS_CRUD: "customers.crud",
  // Deliveries
  DELIVERIES_READ: "deliveries.read",
  DELIVERIES_UPDATE: "deliveries.update",
  DELIVERIES_CRUD: "deliveries.crud",
  // Marketing
  COUPONS_READ: "coupons.read",
  COUPONS_UPDATE: "coupons.update",
  COUPONS_CRUD: "coupons.crud",
  BANNERS_READ: "banners.read",
  BANNERS_UPDATE: "banners.update",
  BANNERS_CRUD: "banners.crud",
  // Communications
  SMS_SEND: "sms.send",
  SMS_SCHEDULE: "sms.schedule",
  // Insights
  ANALYTICS_READ: "analytics.read",
  REPORTS_READ: "reports.read",
  // Admin
  STAFF_MANAGE: "staff.manage",
  SETTINGS_UPDATE: "settings.update",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// ─── requirePermission() ─────────────────────────────────────────────────────

/**
 * Verify that the current user has the required permission.
 *
 * 1. Calls requireRole() to verify auth + role (ADMIN/STAFF/MANAGER)
 * 2. ADMIN role always passes (full access)
 * 3. For STAFF/MANAGER, loads StaffProfile.permissions and checks
 *    if the required permission key is in the array.
 *
 * Usage:
 *   const user = await requirePermission(PERMISSIONS.PRODUCTS_CRUD)
 *
 * Returns the AuthUser if permitted, throws AuthError(403) if not.
 */
export async function requirePermission(
  permission: PermissionKey,
  ...allowedRoles: string[]
): Promise<AuthUser> {
  // Default to ADMIN/STAFF/MANAGER if no roles specified
  const roles = allowedRoles.length > 0 ? allowedRoles : ["SUPER_ADMIN", "ADMIN", "STAFF", "MANAGER"]
  const user = await requireRole(...roles)

  // ADMIN and SUPER_ADMIN retain full access. SUPER_ADMIN is the highest
  // privilege role and must never be rejected by the legacy permission helper.
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return user
  }

  // For STAFF/MANAGER, check StaffProfile.permissions
  const staffProfile = await db.staffProfile.findUnique({
    where: { userId: user.id },
    select: { permissions: true, isActive: true },
  })

  // No staff profile or inactive → deny
  if (!staffProfile || !staffProfile.isActive) {
    throw new AuthError("Forbidden: staff profile inactive or not found", 403)
  }

  // Parse permissions JSON
  let permissions: string[] = []
  try {
    permissions = JSON.parse(staffProfile.permissions)
  } catch {
    permissions = []
  }

  // Check if the required permission is in the list
  if (!permissions.includes(permission)) {
    throw new AuthError(
      `Forbidden: missing permission "${permission}"`,
      403
    )
  }

  return user
}

// ─── Destructive-operation policies ─────────────────────────────────────────

export const DESTRUCTIVE_OPERATIONS = {
  ORDER_CANCEL_OR_RETURN: "ORDER_CANCEL_OR_RETURN",
  PAYMENT_STATUS_CHANGE: "PAYMENT_STATUS_CHANGE",
  PAYMENT_REFUND: "PAYMENT_REFUND",
  PRODUCT_DELETE: "PRODUCT_DELETE",
  CUSTOMER_DISABLE: "CUSTOMER_DISABLE",
  CONTENT_DELETE: "CONTENT_DELETE",
  MARKETING_DELETE: "MARKETING_DELETE",
  STORE_BRANDING_DELETE: "STORE_BRANDING_DELETE",
  BACKUP_RESTORE: "BACKUP_RESTORE",
} as const

export type DestructiveOperation =
  (typeof DESTRUCTIVE_OPERATIONS)[keyof typeof DESTRUCTIVE_OPERATIONS]

interface DestructivePolicy {
  roles: readonly string[]
  permission: PermissionKey
}

/**
 * Central, deny-by-default policy for operations that remove data, disable an
 * account, cancel an order, or alter/refund a payment. Route handlers must call
 * this after validating enough input to identify the requested operation.
 */
export const DESTRUCTIVE_OPERATION_POLICIES: Record<DestructiveOperation, DestructivePolicy> = {
  ORDER_CANCEL_OR_RETURN: {
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    permission: PERMISSIONS.ORDERS_UPDATE,
  },
  PAYMENT_STATUS_CHANGE: {
    roles: ["SUPER_ADMIN", "ADMIN"],
    permission: PERMISSIONS.ORDERS_UPDATE,
  },
  PAYMENT_REFUND: {
    roles: ["SUPER_ADMIN", "ADMIN"],
    permission: PERMISSIONS.ORDERS_REFUND,
  },
  PRODUCT_DELETE: {
    roles: ["SUPER_ADMIN", "ADMIN"],
    permission: PERMISSIONS.PRODUCTS_CRUD,
  },
  CUSTOMER_DISABLE: {
    roles: ["SUPER_ADMIN", "ADMIN"],
    permission: PERMISSIONS.CUSTOMERS_CRUD,
  },
  CONTENT_DELETE: {
    roles: ["SUPER_ADMIN", "ADMIN"],
    permission: PERMISSIONS.SETTINGS_UPDATE,
  },
  MARKETING_DELETE: {
    roles: ["SUPER_ADMIN", "ADMIN"],
    permission: PERMISSIONS.COUPONS_CRUD,
  },
  STORE_BRANDING_DELETE: {
    roles: ["SUPER_ADMIN", "ADMIN"],
    permission: PERMISSIONS.SETTINGS_UPDATE,
  },
  BACKUP_RESTORE: {
    roles: ["SUPER_ADMIN"],
    permission: PERMISSIONS.SETTINGS_UPDATE,
  },
}

export function isRoleAllowedForDestructiveOperation(
  operation: DestructiveOperation,
  role: string,
): boolean {
  return DESTRUCTIVE_OPERATION_POLICIES[operation].roles.includes(role)
}

export async function requireDestructiveOperation(
  operation: DestructiveOperation,
): Promise<AuthUser> {
  const policy = DESTRUCTIVE_OPERATION_POLICIES[operation]
  if (!policy) throw new AuthError("Forbidden: unknown destructive operation", 403)
  return requirePermission(policy.permission, ...policy.roles)
}

// ─── Rate limiter (in-memory token bucket) ───────────────────────────────────

interface RateBucket {
  tokens: number
  lastRefill: number
}

const rateBuckets = new Map<string, RateBucket>()
const globalForRateLimit = globalThis as unknown as { __freedomRateBuckets?: Map<string, RateBucket> }

// Persist on globalThis for HMR safety
if (!globalForRateLimit.__freedomRateBuckets) {
  globalForRateLimit.__freedomRateBuckets = rateBuckets
}

interface RateLimitOptions {
  /** Max actions allowed in the window */
  maxActions: number
  /** Time window in milliseconds */
  windowMs: number
}

/**
 * Check if an action is allowed under the rate limit.
 * Uses a token bucket algorithm — tokens refill at a rate of maxActions/windowMs.
 *
 * Returns { allowed: true } or { allowed: false, retryAfterMs: number }
 *
 * Usage:
 *   const rl = rateLimit(`admin:${user.id}:delete`, { maxActions: 10, windowMs: 60000 })
 *   if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 })
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions
): { allowed: boolean; retryAfterMs?: number; remaining: number } {
  const buckets = globalForRateLimit.__freedomRateBuckets!
  const now = Date.now()
  const refillRate = options.maxActions / options.windowMs // tokens per ms

  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { tokens: options.maxActions, lastRefill: now }
    buckets.set(key, bucket)
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill
  bucket.tokens = Math.min(options.maxActions, bucket.tokens + elapsed * refillRate)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true, remaining: Math.floor(bucket.tokens) }
  }

  // Not enough tokens — calculate when the next token will be available
  const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillRate)
  return { allowed: false, retryAfterMs, remaining: 0 }
}

/**
 * Convenience: check rate limit and return a 429 response if exceeded.
 * Returns null if allowed, or a NextResponse if rate limited.
 *
 * Usage:
 *   const limited = rateLimitOr429(`admin:${user.id}:delete`, { maxActions: 10, windowMs: 60000 })
 *   if (limited) return limited
 */
export function rateLimitOr429(
  key: string,
  options: RateLimitOptions
): { allowed: true; remaining: number } | { allowed: false; retryAfterMs: number; remaining: 0 } {
  const result = rateLimit(key, options)
  if (result.allowed) {
    return { allowed: true, remaining: result.remaining }
  }
  return { allowed: false, retryAfterMs: result.retryAfterMs!, remaining: 0 }
}
