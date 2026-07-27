import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface AdminLogEntry {
  userId: string
  userName?: string | null
  userRole?: string | null
  action: string
  resource: string
  resourceId?: string | null
  details?: Prisma.InputJsonValue
  status?: 'SUCCESS' | 'FAILED'
  request?: { headers: Headers } | null
  ipAddress?: string | null
  userAgent?: string | null
}

function requestMetadata(request?: { headers: Headers } | null) {
  if (!request) return { ipAddress: null, userAgent: null }
  const forwarded = request.headers.get('x-forwarded-for')
  return {
    ipAddress: forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent')?.slice(0, 1000) || null,
  }
}

export class ActivityLogger {
  static async log(entry: AdminLogEntry): Promise<void> {
    try {
      let userName = entry.userName || null
      let userRole = entry.userRole || null
      if (!userName || !userRole) {
        const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { name: true, role: true } })
        userName ||= user?.name || 'Unknown'
        userRole ||= user?.role || 'UNKNOWN'
      }
      const metadata = requestMetadata(entry.request)
      await prisma.adminActivityLog.create({
        data: {
          userId: entry.userId,
          userName: userName || 'Unknown',
          userRole: userRole || 'UNKNOWN',
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId || null,
          details: entry.details,
          ipAddress: entry.ipAddress || metadata.ipAddress,
          userAgent: entry.userAgent || metadata.userAgent,
          status: entry.status || 'SUCCESS',
        },
      })
    } catch (error) {
      // Audit failure is reported but never rolls back the protected operation.
      console.error('[security-audit] Failed to record admin activity:', error)
    }
  }

  static async getLogs(options: {
    userId?: string
    action?: string
    resource?: string
    status?: 'SUCCESS' | 'FAILED'
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }) {
    const page = Math.max(1, options.page || 1)
    const limit = Math.min(100, Math.max(1, options.limit || 50))
    const where: Prisma.AdminActivityLogWhereInput = {}
    if (options.userId) where.userId = options.userId
    if (options.action) where.action = { contains: options.action, mode: 'insensitive' }
    if (options.resource) where.resource = options.resource
    if (options.status) where.status = options.status
    if (options.startDate || options.endDate) {
      where.createdAt = {}
      if (options.startDate) where.createdAt.gte = options.startDate
      if (options.endDate) where.createdAt.lte = options.endDate
    }
    const [logs, total] = await Promise.all([
      prisma.adminActivityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.adminActivityLog.count({ where }),
    ])
    return { logs, total, page, limit, pages: Math.ceil(total / limit) }
  }

  static async getWeeklySummary() {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [totalActions, failedActions, uniqueUsers, topActions, unresolvedAlerts] = await Promise.all([
      prisma.adminActivityLog.count({ where: { createdAt: { gte: from } } }),
      prisma.adminActivityLog.count({ where: { createdAt: { gte: from }, status: 'FAILED' } }),
      prisma.adminActivityLog.findMany({ where: { createdAt: { gte: from } }, select: { userId: true }, distinct: ['userId'] }),
      prisma.adminActivityLog.groupBy({ by: ['action'], where: { createdAt: { gte: from } }, _count: { action: true }, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      prisma.securityAlert.count({ where: { createdAt: { gte: from }, isResolved: false } }),
    ])
    return {
      totalActions,
      failedActions,
      uniqueUsers: uniqueUsers.length,
      topActions: topActions.map((item) => ({ action: item.action, count: item._count.action })),
      unresolvedAlerts,
      period: { from, to: new Date() },
    }
  }
}

export const SECURITY_ACTIONS = {
  LOGIN: 'LOGIN', LOGIN_FAILED: 'LOGIN_FAILED', LOGOUT: 'LOGOUT',
  MFA_SETUP_INITIATED: 'MFA_SETUP_INITIATED', MFA_ENABLED: 'MFA_ENABLED', MFA_DISABLED: 'MFA_DISABLED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED', PASSWORD_RESET: 'PASSWORD_RESET', ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PRODUCT_CREATED: 'PRODUCT_CREATED', PRODUCT_UPDATED: 'PRODUCT_UPDATED', PRODUCT_DELETED: 'PRODUCT_DELETED', PRODUCT_BULK_UPDATED: 'PRODUCT_BULK_UPDATED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED', ORDER_SHIPPED: 'ORDER_SHIPPED', ORDER_DELIVERED: 'ORDER_DELIVERED', ORDER_CANCELLED: 'ORDER_CANCELLED', ORDER_REFUNDED: 'ORDER_REFUNDED',
  CUSTOMER_BLOCKED: 'CUSTOMER_BLOCKED', CUSTOMER_UNBLOCKED: 'CUSTOMER_UNBLOCKED', CUSTOMER_DELETED: 'CUSTOMER_DELETED',
  STAFF_CREATED: 'STAFF_CREATED', STAFF_UPDATED: 'STAFF_UPDATED', STAFF_DEACTIVATED: 'STAFF_DEACTIVATED',
  REFUND_ISSUED: 'REFUND_ISSUED', PAYMENT_VOIDED: 'PAYMENT_VOIDED',
  WHOLESALE_APPROVED: 'WHOLESALE_APPROVED', WHOLESALE_REJECTED: 'WHOLESALE_REJECTED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED', LOGO_UPDATED: 'LOGO_UPDATED', SECURITY_SETTINGS_CHANGED: 'SECURITY_SETTINGS_CHANGED', SECURITY_ALERT_RESOLVED: 'SECURITY_ALERT_RESOLVED', TEST_ACCOUNT_REMOVED: 'TEST_ACCOUNT_REMOVED',
} as const
