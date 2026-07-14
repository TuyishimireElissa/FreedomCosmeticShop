/**
 * Public HTTP routes that must never be reachable in production.
 * Keep this module dependency-free so it is safe in Next.js Edge middleware.
 */
export function isSeedApiPath(pathname: string): boolean {
  const normalized = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname
  return normalized === '/api/seed' || normalized.startsWith('/api/seed/')
}

export function shouldBlockProductionSeedRoute(
  pathname: string,
  nodeEnv: string | undefined,
): boolean {
  return nodeEnv === 'production' && isSeedApiPath(pathname)
}
