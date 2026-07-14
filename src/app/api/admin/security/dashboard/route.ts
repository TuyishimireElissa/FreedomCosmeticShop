export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { calculateMfaCoverage, maskSecurityIdentifier } from '@/lib/security-dashboard'

const PRIVILEGED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'MANAGER']

export async function GET() {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const privilegedWhere = { role: { in: PRIVILEGED_ROLES }, isDeleted: false } as const

    const [
      privilegedUsers,
      unresolvedAlerts,
      highRiskAlerts,
      failedLogins24h,
      uniqueFailureIps,
      lockedAccounts,
      forcedPasswordChanges,
      flaggedTestAccounts,
      passwordResetRequests7d,
      successfulPasswordResets7d,
      adminActions7d,
      failedAdminActions7d,
      alerts,
      recentFailures,
      recentActivity,
      topActions,
    ] = await Promise.all([
      prisma.user.findMany({
        where: privilegedWhere,
        select: { mfaEnabled: true },
      }),
      prisma.securityAlert.count({ where: { isResolved: false } }),
      prisma.securityAlert.count({
        where: { isResolved: false, severity: { in: ['HIGH', 'CRITICAL'] } },
      }),
      prisma.failedLoginAttempt.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.failedLoginAttempt.findMany({
        where: { createdAt: { gte: last24Hours }, ipAddress: { not: null } },
        select: { ipAddress: true },
        distinct: ['ipAddress'],
      }),
      prisma.user.findMany({
        where: { ...privilegedWhere, lockedUntil: { gt: now } },
        select: { id: true, name: true, role: true, lockedUntil: true, failedLoginCount: true },
        orderBy: { lockedUntil: 'desc' },
        take: 20,
      }),
      prisma.user.count({ where: { ...privilegedWhere, mustChangePassword: true } }),
      prisma.user.count({ where: { isDeleted: false, isTestAccount: true } }),
      prisma.passwordResetLog.count({ where: { requestedAt: { gte: last7Days } } }),
      prisma.passwordResetLog.count({
        where: { requestedAt: { gte: last7Days }, wasSuccessful: true },
      }),
      prisma.adminActivityLog.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.adminActivityLog.count({
        where: { createdAt: { gte: last7Days }, status: 'FAILED' },
      }),
      prisma.securityAlert.findMany({
        where: { isResolved: false },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      prisma.failedLoginAttempt.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          phone: true,
          email: true,
          ipAddress: true,
          reason: true,
          createdAt: true,
        },
      }),
      prisma.adminActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          userName: true,
          userRole: true,
          action: true,
          resource: true,
          resourceId: true,
          status: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      prisma.adminActivityLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: last7Days } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 8,
      }),
    ])

    const mfaEnabled = privilegedUsers.filter((user) => user.mfaEnabled).length
    const privilegedTotal = privilegedUsers.length

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: now,
        period: { from: last7Days, to: now },
        summary: {
          unresolvedAlerts,
          highRiskAlerts,
          failedLogins24h,
          uniqueFailureIps24h: uniqueFailureIps.length,
          lockedAccounts: lockedAccounts.length,
          forcedPasswordChanges,
          flaggedTestAccounts,
          passwordResetRequests7d,
          successfulPasswordResets7d,
          adminActions7d,
          failedAdminActions7d,
          mfa: {
            enabled: mfaEnabled,
            total: privilegedTotal,
            coveragePercent: calculateMfaCoverage(mfaEnabled, privilegedTotal),
          },
        },
        alerts,
        lockedAccounts,
        recentFailures: recentFailures.map((attempt) => ({
          ...attempt,
          identifier: maskSecurityIdentifier(attempt.email || attempt.phone),
          email: undefined,
          phone: undefined,
        })),
        recentActivity,
        topActions: topActions.map((item) => ({
          action: item.action,
          count: item._count.action,
        })),
      },
    })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error
      ? Number((error as { statusCode: number }).statusCode)
      : 500
    console.error('Security dashboard API error:', error)
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Failed to load security dashboard' : (error as Error).message },
      { status },
    )
  }
}
