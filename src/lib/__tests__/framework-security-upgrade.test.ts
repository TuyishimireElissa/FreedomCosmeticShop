import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  overrides?: Record<string, Record<string, string>>
}
const nextConfig = read('next.config.js')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? sourceFiles(path) : /(?:route|page|layout)\.tsx?$/.test(path) ? [path] : []
  })
}

describe('patched Next.js framework baseline', () => {
  it('pins the tested patched framework and matching ESLint config', () => {
    expect(packageJson.dependencies?.next).toBe('15.5.20')
    expect(packageJson.devDependencies?.['eslint-config-next']).toBe('15.5.20')
    expect(packageJson.overrides?.next?.postcss).toBe('8.5.10')
  })

  it('keeps linting as a separate required source check', () => {
    expect(packageJson.scripts?.lint).toBe('ESLINT_USE_FLAT_CONFIG=false eslint src --ext .ts,.tsx')
    expect(nextConfig).toContain('ignoreDuringBuilds: true')
    expect(nextConfig).not.toContain('swcMinify')
  })

  it('uses asynchronous dynamic route and page params required by Next 15', () => {
    const dynamicFiles = sourceFiles(resolve(process.cwd(), 'src/app'))
      .filter((path) => path.includes('['))
    const stale = dynamicFiles.filter((path) => /params\s*:\s*\{/.test(readFileSync(path, 'utf8')))
    expect(stale).toEqual([])
  })
})
