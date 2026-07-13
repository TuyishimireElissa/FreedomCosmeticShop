export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const statements = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaBackupCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginDevice" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTestAccount" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS "AdminActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminActivityLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AdminActivityLog_userId_idx" ON "AdminActivityLog"("userId")`,
  `CREATE INDEX IF NOT EXISTS "AdminActivityLog_createdAt_idx" ON "AdminActivityLog"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AdminActivityLog_action_idx" ON "AdminActivityLog"("action")`,
  `CREATE INDEX IF NOT EXISTS "AdminActivityLog_resource_idx" ON "AdminActivityLog"("resource")`,
  `CREATE TABLE IF NOT EXISTS "FailedLoginAttempt" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FailedLoginAttempt_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "FailedLoginAttempt_phone_idx" ON "FailedLoginAttempt"("phone")`,
  `CREATE INDEX IF NOT EXISTS "FailedLoginAttempt_ipAddress_idx" ON "FailedLoginAttempt"("ipAddress")`,
  `CREATE INDEX IF NOT EXISTS "FailedLoginAttempt_createdAt_idx" ON "FailedLoginAttempt"("createdAt")`,
  `CREATE TABLE IF NOT EXISTS "SecurityAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SecurityAlert_type_idx" ON "SecurityAlert"("type")`,
  `CREATE INDEX IF NOT EXISTS "SecurityAlert_isResolved_idx" ON "SecurityAlert"("isResolved")`,
  `CREATE INDEX IF NOT EXISTS "SecurityAlert_createdAt_idx" ON "SecurityAlert"("createdAt")`,
  `CREATE TABLE IF NOT EXISTS "StaffAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeePhone" TEXT NOT NULL,
    "department" TEXT,
    "createdBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3),
    "permissions" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StaffAccount_userId_key" ON "StaffAccount"("userId")`,
  `CREATE INDEX IF NOT EXISTS "StaffAccount_userId_idx" ON "StaffAccount"("userId")`,
  `CREATE TABLE IF NOT EXISTS "PasswordResetLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "wasSuccessful" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PasswordResetLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "PasswordResetLog_userId_idx" ON "PasswordResetLog"("userId")`,
  `CREATE TABLE IF NOT EXISTS "MFAVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TOTP',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MFAVerification_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "MFAVerification_userId_idx" ON "MFAVerification"("userId")`,
]

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { confirmation?: string } | null
    if (body?.confirmation !== 'APPLY_ADDITIVE_SECURITY_SCHEMA') {
      return NextResponse.json({ success: false, error: 'Explicit confirmation is required' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement)
    }, { timeout: 30_000 })

    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'AdminActivityLog', 'FailedLoginAttempt', 'SecurityAlert',
          'StaffAccount', 'PasswordResetLog', 'MFAVerification'
        )
      ORDER BY table_name
    `
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name IN (
          'mfaEnabled', 'mfaSecret', 'mfaBackupCodes', 'failedLoginCount',
          'lockedUntil', 'lastLoginAt', 'lastLoginIp', 'lastLoginDevice',
          'passwordChangedAt', 'mustChangePassword', 'isTestAccount'
        )
      ORDER BY column_name
    `

    return NextResponse.json({
      success: tables.length === 6 && columns.length === 11,
      data: {
        tables: tables.map((item) => item.table_name),
        columns: columns.map((item) => item.column_name),
      },
    })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error
      ? Number((error as { statusCode: number }).statusCode)
      : 500
    console.error('Security schema bootstrap failed:', error)
    return NextResponse.json({
      success: false,
      error: status === 500 ? 'Security schema bootstrap failed' : (error as Error).message,
    }, { status })
  }
}
