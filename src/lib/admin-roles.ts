export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES)

/** Client-safe role check. Server routes must still enforce authorization. */
export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return Boolean(role && ADMIN_ROLE_SET.has(role))
}

export function isOwnerAdminRole(role: string | null | undefined): role is 'SUPER_ADMIN' | 'ADMIN' {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canAdminPermission(
  role: string | null | undefined,
  permissions: readonly string[] | null | undefined,
  permission: string | undefined,
): boolean {
  if (!permission) return true
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  return Boolean(permissions?.includes(permission))
}
