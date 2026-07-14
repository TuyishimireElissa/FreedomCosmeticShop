export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { logActivity } from '@/server/services/activity'
import {
  getTestAccountReasons,
  isConfirmedTestAccount,
  TEST_ACCOUNT_CONFIRMATION,
} from '@/lib/test-account-security'

const cleanupSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(100),
  confirmation: z.literal(TEST_ACCOUNT_CONFIRMATION),
}).strict()

const candidateSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  isTestAccount: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  lastLoginAt: true,
  _count: { select: { orders: true } },
} as const

function errorStatus(error: unknown) {
  return error instanceof Error && 'statusCode' in error
    ? Number((error as { statusCode: number }).statusCode)
    : 500
}

/**
 * Preview active accounts that match conservative, explicit test indicators.
 * No records are changed by this endpoint.
 */
export async function GET() {
  try {
    await requireRole('SUPER_ADMIN')

    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        OR: [
          { isTestAccount: true },
          { phone: '+250788123456' },
          { name: { in: ['Test User', 'Test Account', 'Demo User', 'Demo Account'], mode: 'insensitive' } },
          { email: { endsWith: '@example.com', mode: 'insensitive' } },
          { email: { endsWith: '@example.net', mode: 'insensitive' } },
          { email: { endsWith: '@example.org', mode: 'insensitive' } },
          { email: { endsWith: '@test.com', mode: 'insensitive' } },
          { email: { endsWith: '@invalid', mode: 'insensitive' } },
          { email: { endsWith: '@localhost', mode: 'insensitive' } },
        ],
      },
      select: candidateSelect,
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    const candidates = users.map((user) => ({
      ...user,
      reasons: getTestAccountReasons(user),
      orderCount: user._count.orders,
      _count: undefined,
      protected: user.role === 'SUPER_ADMIN',
    }))

    return NextResponse.json({
      success: true,
      data: {
        candidates,
        count: candidates.length,
        confirmationRequired: TEST_ACCOUNT_CONFIRMATION,
        policy: 'SOFT_DISABLE_ONLY',
      },
    })
  } catch (error) {
    const status = errorStatus(error)
    console.error('Test-account preview error:', error)
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Failed to inspect test accounts' : (error as Error).message },
      { status },
    )
  }
}

/**
 * Soft-disable selected, verified test accounts. Orders and all related history
 * remain intact. Existing access/refresh tokens stop working because every auth
 * path checks User.isDeleted before returning or refreshing a session.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole('SUPER_ADMIN')
    const parsed = cleanupSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid cleanup request' },
        { status: 400 },
      )
    }

    const userIds = [...new Set(parsed.data.userIds)]
    if (userIds.includes(actor.id)) {
      return NextResponse.json({ success: false, error: 'You cannot disable your own account' }, { status: 400 })
    }

    const targets = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: candidateSelect,
    })

    if (targets.length !== userIds.length) {
      return NextResponse.json({ success: false, error: 'One or more selected accounts do not exist' }, { status: 404 })
    }

    const alreadyDisabled = targets.filter((target) => target.isDeleted)
    if (alreadyDisabled.length > 0) {
      return NextResponse.json(
        { success: false, error: 'One or more selected accounts are already disabled' },
        { status: 409 },
      )
    }

    const unverified = targets.filter((target) => !isConfirmedTestAccount(target))
    if (unverified.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cleanup refused: every selected account must match an explicit test indicator' },
        { status: 400 },
      )
    }

    const protectedSuperAdmins = targets.filter((target) => target.role === 'SUPER_ADMIN')
    if (protectedSuperAdmins.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Super Admin accounts cannot be disabled by bulk test-account cleanup' },
        { status: 403 },
      )
    }

    const disabledAt = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: userIds }, isDeleted: false },
        data: { isDeleted: true, deletedAt: disabledAt },
      })
      await tx.staffProfile.updateMany({
        where: { userId: { in: userIds } },
        data: { isActive: false },
      })
      await tx.staffAccount.updateMany({
        where: { userId: { in: userIds } },
        data: { isActive: false, lastActivityAt: disabledAt },
      })
    })

    await Promise.all(targets.map((target) => logActivity({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'TEST_ACCOUNT_REMOVED',
      entityType: 'USER',
      entityId: target.id,
      description: `Soft-disabled confirmed test account; indicators=${getTestAccountReasons(target).join('|')}; preservedOrders=${target._count.orders}`,
      severity: 'critical',
      req: request,
    })))

    return NextResponse.json({
      success: true,
      data: {
        disabledCount: targets.length,
        disabledUserIds: targets.map((target) => target.id),
        preservedOrderCount: targets.reduce((total, target) => total + target._count.orders, 0),
        disabledAt,
        policy: 'SOFT_DISABLE_ONLY',
      },
      message: 'Selected test accounts were disabled; order and audit history was preserved',
    })
  } catch (error) {
    const status = errorStatus(error)
    console.error('Test-account cleanup error:', error)
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Failed to disable test accounts' : (error as Error).message },
      { status },
    )
  }
}
