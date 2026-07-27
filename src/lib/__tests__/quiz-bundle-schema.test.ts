import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8')

describe('quiz and bundle additive schema', () => {
  it('adds bundle, bundle-product, quiz-result, and bundle-type definitions', () => {
    for (const definition of ['model Bundle {', 'model BundleProduct {', 'model QuizResult {', 'enum BundleType {']) {
      expect(schema).toContain(definition)
    }
  })

  it('uses integer RWF pricing consistent with products and orders', () => {
    expect(schema).toContain('bundlePrice         Int')
    expect(schema).toContain('normalTotal         Int')
  })

  it('connects products, users, and optional order-item bundle snapshots', () => {
    expect(schema).toContain('bundles       BundleProduct[]')
    expect(schema).toContain('quizResults           QuizResult[]')
    expect(schema).toContain('bundle   Bundle? @relation(fields: [bundleId]')
  })

  it('preserves all existing commerce and authentication models', () => {
    for (const model of ['model Product {', 'model Order {', 'model OrderItem {', 'model Payment {', 'model User {', 'model OtpVerification {', 'model SearchLog {']) {
      expect(schema).toContain(model)
    }
  })

  it('adds no fictional bundle records or hardcoded product IDs', () => {
    expect(schema).not.toContain('Bright Skin Routine')
    expect(schema).not.toContain('Natural Hair Growth Set')
  })
})
