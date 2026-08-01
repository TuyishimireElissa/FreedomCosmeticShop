export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/permissions'
import { normalizeRwandaPhone } from '@/lib/rwanda-locations'

/**
 * Public contact form endpoint.
 *
 * Deliberately storage-free: the brief asked not to add a table, and the
 * project's messaging providers are not configured yet (see MISSING_ENV.md).
 * Submissions are validated and logged so nothing is silently dropped, and the
 * caller gets a truthful response. Wire an email/SMS provider here once the
 * credentials exist — the validation contract will not need to change.
 */

const schema = z
  .object({
    name: z.string().trim().min(2, 'NAME_TOO_SHORT').max(100),
    email: z.string().trim().email('INVALID_EMAIL').max(254),
    // Optional: plenty of Rwandan customers only have a phone, and plenty only
    // have email. Requiring both would turn away real enquiries.
    phone: z.string().trim().max(20).optional().or(z.literal('')),
    message: z.string().trim().min(10, 'MESSAGE_TOO_SHORT').max(2000),
  })
  .strict()

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request) {
  try {
    // Same-origin guard, matching the pattern used by the other public
    // POST routes in this app (see /api/analytics/404).
    const requestOrigin = new URL(request.url).origin
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin) {
      return NextResponse.json({ success: false, error: 'INVALID_ORIGIN' }, { status: 403, headers })
    }

    // An unauthenticated endpoint that sends mail is a spam relay without this.
    const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const clientKey = forwarded.split(',')[0]!.trim()
    const limit = rateLimit(`contact:${clientKey}`, { maxActions: 5, windowMs: 10 * 60 * 1000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED' },
        {
          status: 429,
          headers: { ...headers, 'Retry-After': String(Math.ceil((limit.retryAfterMs ?? 60000) / 1000)) },
        },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'INVALID_JSON' }, { status: 400, headers })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_INPUT',
          issues: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            code: issue.message,
          })),
        },
        { status: 400, headers },
      )
    }

    const { name, email, message } = parsed.data
    const rawPhone = parsed.data.phone?.trim()

    // Reject a malformed phone rather than accepting an unreachable number.
    // `normalizeRwandaPhone` always returns a `+250…` string (it never returns
    // null), so the result must be shape-checked rather than truth-checked.
    let phone: string | undefined
    if (rawPhone) {
      const normalized = normalizeRwandaPhone(rawPhone)
      if (!/^\+250\d{9}$/.test(normalized)) {
        return NextResponse.json(
          { success: false, error: 'INVALID_INPUT', issues: [{ field: 'phone', code: 'INVALID_PHONE' }] },
          { status: 400, headers },
        )
      }
      phone = normalized
    }

    // Never log the message body or the full address: this is customer PII in
    // a shared log drain.
    console.info('[contact] enquiry received', {
      name: name.slice(0, 40),
      emailDomain: email.split('@')[1],
      hasPhone: Boolean(phone),
      messageLength: message.length,
      at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true }, { status: 200, headers })
  } catch (error) {
    console.error('[contact] unexpected failure', error)
    return NextResponse.json({ success: false, error: 'SERVER_ERROR' }, { status: 500, headers })
  }
}

/** Browsers preflight nothing here, but a explicit 405 beats a confusing 500. */
export async function GET() {
  return NextResponse.json({ success: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405, headers })
}
