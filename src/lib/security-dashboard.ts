const SECURITY_DASHBOARD_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

export function canViewSecurityDashboard(role: string | null | undefined): boolean {
  return Boolean(role && SECURITY_DASHBOARD_ROLES.has(role))
}

export function maskSecurityIdentifier(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.includes('@')) {
    const [local, domain] = value.split('@')
    return `${local.slice(0, 2)}***@${domain}`
  }
  return value.length > 6 ? `${value.slice(0, 5)}***${value.slice(-2)}` : '***'
}

export function calculateMfaCoverage(enabled: number, total: number): number {
  if (total <= 0) return 0
  const safeEnabled = Math.min(Math.max(0, enabled), total)
  return Math.round((safeEnabled / total) * 100)
}
