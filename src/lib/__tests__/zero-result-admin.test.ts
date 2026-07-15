import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const api = read('src/app/api/admin/search/zero-results/route.ts')
const component = read('src/components/admin/ZeroResultSearches.tsx')
const adminView = read('src/components/admin/AdminView.tsx')

describe('admin zero-result search dashboard', () => {
  it('uses custom role authentication and never reintroduces NextAuth', () => {
    expect(api).toContain("requireRole('ADMIN', 'SUPER_ADMIN')")
    expect(api).not.toContain('next-auth')
    expect(api).not.toContain('getServerSession')
  })

  it('aggregates only real zero-result logs from the last 30 days', () => {
    expect(api).toContain('prisma.searchLog.groupBy')
    expect(api).toContain('hasResults: false')
    expect(api).toContain('30 * 24 * 60 * 60 * 1000')
    expect(api).toContain('take: 50')
  })

  it('provides abortable loading, error, retry, empty, and data states', () => {
    expect(component).toContain('new AbortController()')
    expect(component).toContain("t('common.retry')")
    expect(component).toContain("t('search.zero_results_empty')")
    expect(component).toContain('data.map((entry)')
  })

  it('is visible only to Admin and Super Admin roles on the overview', () => {
    expect(adminView).toContain('user.role === "ADMIN" || user.role === "SUPER_ADMIN"')
    expect(adminView).toContain('<ZeroResultSearches />')
  })
})
