/**
 * Next.js middleware for Ubumwe Beauty.
 *
 * Currently adds security headers to all responses. In the future:
 *   - Block /admin routes unless authenticated
 *   - Locale routing (when i18n is enabled)
 *   - Rate limiting (via Redis / Upstash)
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(_req: NextRequest) {
  const res = NextResponse.next()

  // ─── Security headers ─────────────────────────────────────────────
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-XSS-Protection", "1; mode=block")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  // Content Security Policy (relaxed for dev; tighten in prod)
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https:",
        "frame-ancestors 'none'",
      ].join("; ")
    )
  }

  return res
}

export const config = {
  // Apply to all routes except static assets and Next internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg).*)"],
}
