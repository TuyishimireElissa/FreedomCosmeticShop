import { SignJWT, jwtVerify } from 'jose'
import { resolveAuthSecret } from '@/lib/auth-secret'

const ISSUER = 'freedom-cosmetic-shop'
const AUDIENCE = 'freedom-order-access'
const ORDER_ACCESS_TTL = '30d'

function signingKey() {
  return new TextEncoder().encode(resolveAuthSecret(
    process.env.NEXTAUTH_SECRET,
    process.env.JWT_SECRET,
    process.env.NODE_ENV,
  ))
}

/**
 * Create a scoped, signed bearer token for guest checkout payment/status and
 * order tracking. The token contains no customer PII and cannot authorize
 * changes to any other order.
 */
export async function signOrderAccessToken(orderId: string): Promise<string> {
  return new SignJWT({ orderId, purpose: 'order-access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ORDER_ACCESS_TTL)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(signingKey())
}

export async function verifyOrderAccessToken(token: string | null | undefined, orderId: string): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    return payload.purpose === 'order-access' && payload.orderId === orderId
  } catch {
    return false
  }
}

export function orderAccessTokenFromRequest(request: Request): string | null {
  const header = request.headers.get('x-order-access-token')
  if (header) return header
  const authorization = request.headers.get('authorization')
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7)
  try {
    return new URL(request.url).searchParams.get('accessToken')
  } catch {
    return null
  }
}
