const DEVELOPMENT_AUTH_SECRET = 'dev-only-secret-change-in-production-32chars'

/**
 * Resolve the JWT signing secret. Production must fail closed rather than ever
 * signing tokens with a source-code fallback.
 */
export function resolveAuthSecret(
  nextAuthSecret: string | undefined,
  jwtSecret: string | undefined,
  nodeEnv: string | undefined,
): string {
  const configured = nextAuthSecret || jwtSecret
  if (nodeEnv === 'production') {
    if (!configured || configured.length < 32) {
      throw new Error('A production JWT secret of at least 32 characters is required')
    }
    return configured
  }
  return configured || DEVELOPMENT_AUTH_SECRET
}
