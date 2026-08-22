/**
 * Signed, expiring access for the father's mobile pricing page.
 *
 * WHY A TOKEN AND NOT A LOGIN
 *
 * The person who knows the prices is not an admin user and has no account. The
 * brief asked for a link he can tap from WhatsApp. Everything under /admin is
 * permission-guarded, so that link would either not work for him at all, or it
 * would have to be an unauthenticated page — which would leave price editing
 * open to anyone who ever saw the URL, including anyone he forwards it to by
 * accident.
 *
 * So: a signed JWT with a 7-day expiry, following the exact pattern already
 * used by src/lib/order-access.ts for guest order tracking. Same `jose`
 * dependency, same secret resolution, same issuer. No new packages.
 *
 * WHAT THE TOKEN CAN AND CANNOT DO
 *
 *  - It grants exactly one capability: read the unpriced list and submit
 *    prices. It is scoped by `purpose`, so an order-access token cannot be
 *    replayed here and this token cannot be replayed anywhere else.
 *  - It carries no personal data and no admin identity.
 *  - It cannot delete, deactivate, or edit anything except price and
 *    wholesalePrice on products that are currently unpriced.
 *  - It expires. A forwarded link stops working after 7 days.
 */

import { SignJWT, jwtVerify } from 'jose'
import { resolveAuthSecret } from '@/lib/auth-secret'

const ISSUER = 'freedom-cosmetic-shop'
const AUDIENCE = 'freedom-quick-prices'
const PURPOSE = 'quick-prices'

/** Owner decision 2026-08-22: seven days. */
export const QUICK_PRICE_TTL = '7d'
export const QUICK_PRICE_TTL_DAYS = 7

function signingKey() {
  return new TextEncoder().encode(resolveAuthSecret(
    process.env.NEXTAUTH_SECRET,
    process.env.JWT_SECRET,
    process.env.NODE_ENV,
  ))
}

export interface QuickPriceClaims {
  /** Which batch of the price request this link was generated for. */
  batch: number
  /** Who issued it, for the audit log. Never rendered to the recipient. */
  issuedBy: string
}

export async function signQuickPriceToken(claims: QuickPriceClaims): Promise<string> {
  return new SignJWT({ ...claims, purpose: PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(QUICK_PRICE_TTL)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(signingKey())
}

/**
 * Verify a quick-price token.
 *
 * Returns null rather than throwing, and never distinguishes "expired" from
 * "forged" to the caller — both are simply refused, so a probe learns nothing
 * about why a token failed.
 */
export async function verifyQuickPriceToken(
  token: string | null | undefined,
): Promise<QuickPriceClaims | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    if (payload.purpose !== PURPOSE) return null
    const batch = Number(payload.batch)
    if (!Number.isInteger(batch) || batch < 1) return null
    return { batch, issuedBy: String(payload.issuedBy || '') }
  } catch {
    return null
  }
}

/** Read the token from the query string or the bearer header. */
export function quickPriceTokenFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null
  try {
    return new URL(request.url).searchParams.get('token')
  } catch {
    return null
  }
}
