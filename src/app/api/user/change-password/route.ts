export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, requireAuth, verifyPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'

const schema = z.object({
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(12).max(200)
    .regex(/[a-z]/, 'Password needs a lowercase letter')
    .regex(/[A-Z]/, 'Password needs an uppercase letter')
    .regex(/\d/, 'Password needs a number')
    .regex(/[^A-Za-z0-9]/, 'Password needs a symbol'),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const limit = rateLimit(`password-change:${user.id}`, { maxActions: 5, windowMs: 60 * 60 * 1000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many attempts' }, { status: 429 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid password' }, { status: 400 })
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
    if (!account?.passwordHash || !(await verifyPassword(parsed.data.currentPassword, account.passwordHash))) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 })
    }
    if (await verifyPassword(parsed.data.newPassword, account.passwordHash)) {
      return NextResponse.json({ success: false, error: 'New password must be different' }, { status: 400 })
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } })
    return NextResponse.json({ success: true, data: { changed: true } })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ success: false, error: 'Password change failed' }, { status: 500 })
  }
}
