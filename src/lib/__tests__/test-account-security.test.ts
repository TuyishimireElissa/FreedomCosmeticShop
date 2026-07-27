import { describe, expect, it } from 'vitest'
import { getTestAccountReasons, isConfirmedTestAccount } from '@/lib/test-account-security'

const realAccount = { isTestAccount: false, phone: '+250783456789', email: 'aline@freedomcosmetics.rw', name: 'Aline Uwase' }

describe('test-account security', () => {
  it('does not classify a normal Rwanda customer as a test account', () => {
    expect(getTestAccountReasons(realAccount)).toEqual([])
    expect(isConfirmedTestAccount(realAccount)).toBe(false)
  })

  it('recognizes the explicit database flag', () => {
    expect(getTestAccountReasons({ ...realAccount, isTestAccount: true })).toContain('EXPLICIT_TEST_FLAG')
  })

  it('never treats a phone number as proof of a test account', () => {
    expect(getTestAccountReasons({ ...realAccount, phone: '+250788123456' })).toEqual([])
  })

  it('recognizes IANA-reserved example domains case-insensitively', () => {
    expect(getTestAccountReasons({ ...realAccount, email: 'demo@EXAMPLE.COM' })).toContain('RESERVED_TEST_EMAIL_DOMAIN')
  })

  it('does not use broad or exact name matching', () => {
    expect(isConfirmedTestAccount({ ...realAccount, name: 'Testimony Uwase' })).toBe(false)
    expect(isConfirmedTestAccount({ ...realAccount, name: 'Demo Account' })).toBe(false)
  })

  it('does not treat ordinary test.com addresses as reserved', () => {
    expect(isConfirmedTestAccount({ ...realAccount, email: 'owner@test.com' })).toBe(false)
  })
})
