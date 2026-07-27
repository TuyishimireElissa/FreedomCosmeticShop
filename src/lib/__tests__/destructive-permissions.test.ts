import { describe, expect, it } from 'vitest'
import {
  DESTRUCTIVE_OPERATIONS,
  isRoleAllowedForDestructiveOperation,
} from '@/lib/permissions'

describe('destructive-operation role policies', () => {
  it('never allows customer or staff roles to perform destructive operations', () => {
    for (const operation of Object.values(DESTRUCTIVE_OPERATIONS)) {
      expect(isRoleAllowedForDestructiveOperation(operation, 'CUSTOMER')).toBe(false)
      expect(isRoleAllowedForDestructiveOperation(operation, 'STAFF')).toBe(false)
    }
  })

  it('allows managers to cancel or return orders only', () => {
    expect(isRoleAllowedForDestructiveOperation(
      DESTRUCTIVE_OPERATIONS.ORDER_CANCEL_OR_RETURN,
      'MANAGER',
    )).toBe(true)
    expect(isRoleAllowedForDestructiveOperation(
      DESTRUCTIVE_OPERATIONS.PAYMENT_STATUS_CHANGE,
      'MANAGER',
    )).toBe(false)
    expect(isRoleAllowedForDestructiveOperation(
      DESTRUCTIVE_OPERATIONS.PRODUCT_DELETE,
      'MANAGER',
    )).toBe(false)
  })

  it('allows only Admin and Super Admin to alter or refund payments', () => {
    for (const operation of [
      DESTRUCTIVE_OPERATIONS.PAYMENT_STATUS_CHANGE,
      DESTRUCTIVE_OPERATIONS.PAYMENT_REFUND,
    ]) {
      expect(isRoleAllowedForDestructiveOperation(operation, 'ADMIN')).toBe(true)
      expect(isRoleAllowedForDestructiveOperation(operation, 'SUPER_ADMIN')).toBe(true)
      expect(isRoleAllowedForDestructiveOperation(operation, 'MANAGER')).toBe(false)
      expect(isRoleAllowedForDestructiveOperation(operation, 'STAFF')).toBe(false)
    }
  })

  it('allows only Admin and Super Admin to delete products, content, marketing, or branding', () => {
    for (const operation of [
      DESTRUCTIVE_OPERATIONS.PRODUCT_DELETE,
      DESTRUCTIVE_OPERATIONS.CONTENT_DELETE,
      DESTRUCTIVE_OPERATIONS.MARKETING_DELETE,
      DESTRUCTIVE_OPERATIONS.STORE_BRANDING_DELETE,
      DESTRUCTIVE_OPERATIONS.CUSTOMER_DISABLE,
    ]) {
      expect(isRoleAllowedForDestructiveOperation(operation, 'ADMIN')).toBe(true)
      expect(isRoleAllowedForDestructiveOperation(operation, 'SUPER_ADMIN')).toBe(true)
      expect(isRoleAllowedForDestructiveOperation(operation, 'MANAGER')).toBe(false)
      expect(isRoleAllowedForDestructiveOperation(operation, 'STAFF')).toBe(false)
    }
  })

  it('reserves production backup restore for Super Admin', () => {
    expect(isRoleAllowedForDestructiveOperation(
      DESTRUCTIVE_OPERATIONS.BACKUP_RESTORE,
      'SUPER_ADMIN',
    )).toBe(true)
    expect(isRoleAllowedForDestructiveOperation(
      DESTRUCTIVE_OPERATIONS.BACKUP_RESTORE,
      'ADMIN',
    )).toBe(false)
  })
})
