import { describe, expect, it } from 'vitest'
import { getTestAccountReasons, isConfirmedTestAccount } from '@/lib/test-account-security'

const realAccount = {
  isTestAccount: false,
  phone: '+250783456789',
  email: 'aline@freedomcosmetics.rw',
  name: 'Aline Uwase',
}

describe('test-account security', () => {
  it('does not classify a normal Rwanda customer as a test account', () => {
    expect(getTestAccountReasons(realAccount)).toEqual([])
    expect(isConfirmedTestAccount(realAccount)).toBe(false)
  })

  it('recognizes the explicit database flag', () => {
    expect(getTestAccountReasons({ ...realAccount, isTestAccount: true }))
      .toContain('EXPLICIT_TEST_FLAG')
  })

  it('recognizes the documented legacy test phone', () => {
    expect(getTestAccountReasons({ ...realAccount, phone: '+250788123456' }))
      .toContain('KNOWN_TEST_PHONE')
  })

  it('recognizes reserved domains case-insensitively', () => {
    expect(getTestAccountReasons({ ...realAccount, email: 'demo@EXAMPLE.COM' }))
      .toContain('RESERVED_TEST_EMAIL_DOMAIN')
  })

  it('does not use broad partial-name matching', () => {
    expect(isConfirmedTestAccount({ ...realAccount, name: 'Testimony Uwase' })).toBe(false)
  })

  it('recognizes only explicit test or demo account names', () => {
    expect(getTestAccountReasons({ ...realAccount, name: ' Demo Account ' }))
      .toContain('EXPLICIT_TEST_NAME')
  })
})
