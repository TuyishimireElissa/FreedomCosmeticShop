import { describe, expect, it } from 'vitest'
import {
  calculateMfaCoverage,
  canViewSecurityDashboard,
  maskSecurityIdentifier,
} from '@/lib/security-dashboard'

describe('security dashboard rules', () => {
  it('allows only Admin and Super Admin roles', () => {
    expect(canViewSecurityDashboard('ADMIN')).toBe(true)
    expect(canViewSecurityDashboard('SUPER_ADMIN')).toBe(true)
    expect(canViewSecurityDashboard('MANAGER')).toBe(false)
    expect(canViewSecurityDashboard('STAFF')).toBe(false)
    expect(canViewSecurityDashboard('CUSTOMER')).toBe(false)
  })

  it('masks phone identifiers shown in failed-login telemetry', () => {
    expect(maskSecurityIdentifier('+250788123456')).toBe('+2507***56')
  })

  it('masks email identifiers while preserving the investigation domain', () => {
    expect(maskSecurityIdentifier('admin@example.com')).toBe('ad***@example.com')
  })

  it('handles missing and short identifiers safely', () => {
    expect(maskSecurityIdentifier(null)).toBeNull()
    expect(maskSecurityIdentifier('12345')).toBe('***')
  })

  it('calculates real MFA coverage without exceeding valid bounds', () => {
    expect(calculateMfaCoverage(3, 4)).toBe(75)
    expect(calculateMfaCoverage(10, 4)).toBe(100)
    expect(calculateMfaCoverage(-1, 4)).toBe(0)
    expect(calculateMfaCoverage(0, 0)).toBe(0)
  })
})
