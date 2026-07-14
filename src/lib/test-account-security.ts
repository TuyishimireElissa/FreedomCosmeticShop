export const TEST_ACCOUNT_CONFIRMATION = 'DISABLE_SELECTED_TEST_ACCOUNTS' as const

/**
 * Known legacy values are intentionally narrow. Never infer test status from a
 * broad phone pattern or a partial name because that could disable a real user.
 */
const KNOWN_TEST_PHONES = new Set([
  '+250788123456', // Legacy account documented by scripts/reset-admin-password.ts
])

const RESERVED_TEST_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'test.com',
  'invalid',
  'localhost',
])

const EXPLICIT_TEST_NAMES = new Set([
  'test user',
  'test account',
  'demo user',
  'demo account',
])

export interface TestAccountIdentity {
  isTestAccount: boolean
  phone: string
  email: string | null
  name: string
}

export type TestAccountReason =
  | 'EXPLICIT_TEST_FLAG'
  | 'KNOWN_TEST_PHONE'
  | 'RESERVED_TEST_EMAIL_DOMAIN'
  | 'EXPLICIT_TEST_NAME'

export function getTestAccountReasons(account: TestAccountIdentity): TestAccountReason[] {
  const reasons: TestAccountReason[] = []

  if (account.isTestAccount) reasons.push('EXPLICIT_TEST_FLAG')
  if (KNOWN_TEST_PHONES.has(account.phone.trim())) reasons.push('KNOWN_TEST_PHONE')

  const domain = account.email?.trim().toLowerCase().split('@').at(-1)
  if (domain && RESERVED_TEST_EMAIL_DOMAINS.has(domain)) {
    reasons.push('RESERVED_TEST_EMAIL_DOMAIN')
  }

  if (EXPLICIT_TEST_NAMES.has(account.name.trim().toLowerCase())) {
    reasons.push('EXPLICIT_TEST_NAME')
  }

  return reasons
}

export function isConfirmedTestAccount(account: TestAccountIdentity): boolean {
  return getTestAccountReasons(account).length > 0
}
