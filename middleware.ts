/**
 * Next.js middleware for FreedomCosmeticShop.
 *
 * Adds security headers to all responses and permanently blocks dangerous
 * deployment-only HTTP routes in production. Authentication remains the
 * application's existing custom JWT/httpOnly-cookie flow.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { shouldBlockProductionSeedRoute } from "@/lib/route-security"

function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-XSS-Protection", "1; mode=block")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.supabase.co",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co https://api.paypack.rw https://api.flutterwave.com",
        "frame-src 'self' https://checkout.flutterwave.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ")
    )
  }

  return res
}

export function middleware(req: NextRequest) {
  // Defense 1: stop the request at the edge before the route module executes.
  // This covers every HTTP method and nested/trailing-slash variants.
  if (shouldBlockProductionSeedRoute(req.nextUrl.pathname, process.env.NODE_ENV)) {
    const blocked = NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    )
    blocked.headers.set("Cache-Control", "private, no-store, max-age=0")
    blocked.headers.set("X-Robots-Tag", "noindex, nofollow")
    return applySecurityHeaders(blocked)
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  // Apply to all routes except static assets and Next internals. /api/seed is
  // intentionally included so production requests are rejected at the edge.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg).*)"],
}
