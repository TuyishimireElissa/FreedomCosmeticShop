import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const monitor = read('src/components/dev/PerformanceMonitor.tsx')
const layout = read('src/app/layout.tsx')
const guide = read('docs/LOW_DATA_TESTING.md')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

describe('low-data testing tools', () => {
  it('keeps the performance monitor development-only', () => {
    expect(layout).toContain("process.env.NODE_ENV === 'development' && <PerformanceMonitor />")
    expect(monitor.match(/process\.env\.NODE_ENV !== 'development'/g)?.length).toBeGreaterThanOrEqual(2)
    expect(monitor).toContain('return null')
  })

  it('records local diagnostics without sending monitoring data', () => {
    expect(monitor).toContain("performance.getEntriesByType('resource')")
    expect(monitor).toContain('resource.transferSize')
    expect(monitor).toContain('resource.encodedBodySize')
    expect(monitor).toContain("observe('largest-contentful-paint'")
    expect(monitor).toContain("observe('layout-shift'")
    expect(monitor).toContain("observe('longtask'")
    expect(monitor).toContain("console.info('[FCS development performance snapshot]'")
    expect(monitor).not.toMatch(/\bfetch\s*\(/)
    expect(monitor).not.toContain('localStorage')
  })

  it('provides a dedicated automated low-data command', () => {
    const command = packageJson.scripts?.['test:low-data'] || ''
    expect(command).toContain('vitest run')
    expect(command).toContain('low-data-infrastructure.test.ts')
    expect(command).toContain('offline-cart.test.ts')
    expect(command).toContain('resilient-fetch.test.ts')
    expect(command).toContain('low-data-testing-tools.test.ts')
  })

  it('documents network, image, offline, resilience, device, and accessibility testing', () => {
    for (const text of [
      'Chrome throttling procedure',
      'Responsive images and hero',
      'Product pagination and deferred sections',
      'Offline-first cart',
      'Network resilience and form retention',
      'Real Rwanda mobile testing',
      'Accessibility checks',
      'Lighthouse and browser tooling',
    ]) expect(guide).toContain(text)
  })

  it('does not pre-check or claim unexecuted manual evidence', () => {
    expect(guide).not.toMatch(/- \[[xX]\]/)
    expect(guide).toContain('Not tested')
    expect(guide).toContain('No physical Slow 3G')
    expect(guide).toContain('not evidence that the application meets')
    expect(guide).toContain('Unchecked items mean “not established,” not “passed by implementation.”')
  })
})
