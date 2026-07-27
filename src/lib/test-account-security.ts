export const TEST_ACCOUNT_CONFIRMATION = 'DISABLE_SELECTED_TEST_ACCOUNTS' as const

const RESERVED_TEST_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'invalid',
  'localhost',
])

export interface TestAccountIdentity {
  isTestAccount: boolean
  phone: string
  email: string | null
  name: string
}

export type TestAccountReason = 'EXPLICIT_TEST_FLAG' | 'RESERVED_TEST_EMAIL_DOMAIN'

/** Only explicit flags or IANA-reserved example domains can identify test data. */
export function getTestAccountReasons(account: TestAccountIdentity): TestAccountReason[] {
  const reasons: TestAccountReason[] = []
  if (account.isTestAccount) reasons.push('EXPLICIT_TEST_FLAG')
  const domain = account.email?.trim().toLowerCase().split('@').at(-1)
  if (domain && RESERVED_TEST_EMAIL_DOMAINS.has(domain)) reasons.push('RESERVED_TEST_EMAIL_DOMAIN')
  return reasons
}

export function isConfirmedTestAccount(account: TestAccountIdentity): boolean {
  return getTestAccountReasons(account).length > 0
}
