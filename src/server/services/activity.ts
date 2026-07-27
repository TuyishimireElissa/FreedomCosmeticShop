/**
 * Activity Log service — best-effort audit trail for staff/admin actions.
 *
 * Design principles:
 *   1. Writes are non-blocking — failures are swallowed, never break business logic.
 *   2. Uses denormalized `userName` + `userRole` snapshots so the audit trail
 *      survives user deletion or role changes.
 *   3. Captures IP + User-Agent for security forensics.
 *   4. Severity defaults to "info"; callers can escalate to "warn" or "critical"
 *      for actions like failed logins, refunds, customer blocks.
 *
 * Usage:
 *   import { logActivity } from "@/server/services/activity"
 *   await logActivity({
 *     userId: adminUser.id,
 *     userName: adminUser.name,
 *     userRole: adminUser.role,
 *     action: "ORDER_UPDATE",
 *     entityType: "ORDER",
 *     entityId: order.id,
 *     description: `Updated order ${order.orderNumber} to SHIPPED`,
 *     severity: "info",
 *     req, // optional — extracts IP + User-Agent
 *   })
 */

import { db } from "@/lib/db"
import { ActivityLogger } from "@/lib/activity-logger"

export interface LogActivityInput {
  userId?: string | null
  userName?: string | null
  userRole?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  description?: string | null
  severity?: "info" | "warn" | "critical"
  req?: { headers: Headers } | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Write a single audit-log entry. Best-effort: errors are logged but never thrown.
 *
 * Pass either `req` (to auto-extract IP + User-Agent) or `ipAddress` + `userAgent`
 * directly (useful when called from services that don't have the request object).
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    // Extract IP and User-Agent from the request if provided
    let ipAddress = input.ipAddress ?? null
    let userAgent = input.userAgent ?? null
    if (input.req?.headers) {
      try {
        const forwarded = input.req.headers.get("x-forwarded-for")
        if (forwarded) {
          ipAddress = forwarded.split(",")[0].trim()
        } else {
          const realIp = input.req.headers.get("x-real-ip")
          if (realIp) ipAddress = realIp
        }
        const ua = input.req.headers.get("user-agent")
        if (ua) userAgent = ua
      } catch {
        // ignore header extraction errors
      }
    }

    await db.activityLog.create({
      data: {
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        userRole: input.userRole ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        description: input.description ?? null,
        severity: input.severity ?? "info",
        ipAddress,
        userAgent,
      },
    })

    if (input.userId) {
      await ActivityLogger.log({
        userId: input.userId,
        userName: input.userName,
        userRole: input.userRole,
        action: input.action,
        resource: input.entityType || "SYSTEM",
        resourceId: input.entityId,
        details: {
          description: input.description || "",
          severity: input.severity || "info",
        },
        status: input.action.includes("FAILED") ? "FAILED" : "SUCCESS",
        ipAddress,
        userAgent,
      })
    }
  } catch (error) {
    // Best-effort: never throw. Log to stderr for visibility.
    console.error("[activity] Failed to write audit log:", error)
  }
}

/**
 * Convenience: log a login event. Called after successful authentication.
 */
export async function logLogin(params: {
  userId: string
  userName: string
  userRole: string
  req?: { headers: Headers } | null
  ipAddress?: string | null
  userAgent?: string | null
  success: boolean
}): Promise<void> {
  return logActivity({
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    action: params.success ? "AUTH_LOGIN" : "AUTH_FAILED",
    entityType: "USER",
    entityId: params.userId,
    description: params.success
      ? `Successful login: ${params.userName} (${params.userRole})`
      : `Failed login attempt for user ${params.userId}`,
    severity: params.success ? "info" : "warn",
    req: params.req,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}
