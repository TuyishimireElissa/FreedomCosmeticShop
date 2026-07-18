import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const authMe = read('src/app/api/auth/me/route.ts')
const wishlist = read('src/app/api/wishlist/route.ts')

const expectedPolicy = "'Cache-Control': 'private, no-store, max-age=0'"

describe('user-specific API cache hardening', () => {
  it('marks every current-user response private and non-cacheable', () => {
    expect(authMe).toContain(expectedPolicy)
    expect(authMe).toContain('privateJson({ error: "Not authenticated" }, 401)')
    expect(authMe).toContain('privateJson({ user })')
    expect(authMe).toContain('privateJson({ error: "Failed to fetch user" }, 500)')
  })

  it('marks wishlist reads and mutations private and non-cacheable', () => {
    expect(wishlist).toContain(expectedPolicy)
    expect(wishlist).toContain('const fail = (error: string, status: number) => privateJson')
    expect(wishlist).toContain('return privateJson({ success: true, data: { wishlist }, wishlist })')
    expect(wishlist).toContain('return privateJson({ success: true, data: { item }, item }, 201)')
    expect(wishlist).toContain('return privateJson({ success: true, data: { productId: parsed.data.productId } })')
  })

  it('uses unknown rather than any for response payloads', () => {
    expect(authMe).toContain('(body: unknown')
    expect(wishlist).toContain('(body: unknown')
    expect(authMe).not.toMatch(/\bany\b/)
    expect(wishlist).not.toMatch(/\bany\b/)
  })
})
