import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const publicWholesaleCopy = [
  'src/components/wholesale/WholesaleView.tsx',
  'src/lib/i18n/translations/en.ts',
  'src/lib/i18n/translations/rw.ts',
].map(read).join('\n')

const unsupportedCustomerCountClaims = [
  /100\+\s+(?:Rwandan\s+)?businesses/i,
  /join\s+hundreds\s+of\s+(?:Rwanda(?:n)?\s+)?salons/i,
  /serving\s+500\+?\s+shops/i,
  /trusted\s+by\s+beauty\s+professionals/i,
  /bucuruzi\s+burenga\s+100/i,
]

describe('honest public wholesale statistics', () => {
  it('contains no unsupported wholesale customer-count or social-proof claims', () => {
    for (const claim of unsupportedCustomerCountClaims) {
      expect(publicWholesaleCopy).not.toMatch(claim)
    }
  })

  it('uses neutral translated CTA copy instead of an invented customer total', () => {
    const view = read('src/components/wholesale/WholesaleView.tsx')
    const english = read('src/lib/i18n/translations/en.ts')
    const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

    expect(view).toContain("t('wholesale.registered_business_cta')")
    expect(view).not.toContain("t('wholesale.join_businesses')")
    expect(english).toContain("registered_business_cta: 'Apply for wholesale access for your registered Rwanda business.'")
    expect(kinyarwanda).toContain("registered_business_cta: 'Saba konti yo kurangura ku bucuruzi bwawe bwanditswe mu Rwanda.', // verified-rw")
  })
})
