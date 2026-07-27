import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/bundles/BundlesView.tsx'), 'utf8')

describe('bundle listing page', () => {
  it('loads real bundles from the API with abortable requests', () => {
    expect(source).toContain("fetch(`/api/bundles${query}`")
    expect(source).toContain('new AbortController()')
    expect(source).toContain('return () => controller.abort()')
  })
  it('supports all bundle type filters', () => {
    for (const type of ['ROUTINE', 'CONCERN', 'HAIR', 'MAKEUP', 'GIFT', 'STARTER']) expect(source).toContain(`'${type}'`)
  })
  it('uses horizontal snap scrolling on mobile and a grid on desktop', () => {
    expect(source).toContain('snap-x')
    expect(source).toContain('overflow-x-auto')
    expect(source).toContain('md:grid-cols-2')
  })
  it('uses translations for customer-facing states', () => {
    for (const key of ['bundles.title', 'bundles.subtitle', 'bundles.quiz_cta', 'bundles.empty', 'bundles.load_failed']) expect(source).toContain(`t('${key}')`)
  })
})
