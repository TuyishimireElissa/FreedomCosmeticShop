import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthOrThrow, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

const Day = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
const schema = z.object({ preferredDeliveryDays: z.array(Day).max(2) })

export async function GET() {
  try {
    const user = await requireAuthOrThrow()
    if (user.wholesaleStatus !== 'APPROVED') return NextResponse.json({ error: 'Wholesale account not approved' }, { status: 403 })
    return NextResponse.json({ preferredDeliveryDays: user.preferredDeliveryDays || [] })
  } catch (error) { return handle(error) }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthOrThrow()
    if (user.wholesaleStatus !== 'APPROVED') return NextResponse.json({ error: 'Wholesale account not approved' }, { status: 403 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Select no more than two delivery days' }, { status: 400 })
    const updated = await db.user.update({ where: { id: user.id }, data: { preferredDeliveryDays: parsed.data.preferredDeliveryDays }, select: { preferredDeliveryDays: true } })
    return NextResponse.json(updated)
  } catch (error) { return handle(error) }
}

function handle(error: unknown) {
  const status = error instanceof AuthError ? error.statusCode : 500
  return NextResponse.json({ error: status === 500 ? 'Unable to update wholesale preferences' : (error as Error).message }, { status })
}
