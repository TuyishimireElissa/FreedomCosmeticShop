import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const otp = read('src/lib/otp.ts')
const schema = read('prisma/schema.prisma')
const authService = read('src/server/services/auth.ts')
const registerPage = read('src/app/(auth)/register/page.tsx')

describe('production registration recovery', () => {
  it('stores OTP state durably instead of using server memory', () => {
    expect(schema).toContain('model OtpVerification {')
    expect(otp).toContain('db.otpVerification.create')
    expect(otp).toContain('db.otpVerification.findFirst')
    expect(otp).not.toContain('new Map<string, OtpEntry>')
  })

  it('uses cryptographic OTP generation, hashing, and timing-safe comparison', () => {
    expect(otp).toContain('randomInt(0, 1_000_000)')
    expect(otp).toContain("createHmac('sha256'")
    expect(otp).toContain('timingSafeEqual')
    expect(otp).not.toContain('Math.random')
  })

  it('never exposes an OTP code in production and fails clearly when SMS is disabled', () => {
    expect(otp).toContain("process.env.NODE_ENV === 'production' && !features.sms")
    expect(otp).toContain("process.env.NODE_ENV === 'production' ? undefined : code")
  })

  it('awaits database-backed verification for registration, login, and reset', () => {
    expect(authService.match(/await verifyOtp/g)?.length).toBe(3)
  })

  it('makes skin type optional and improves native form validation', () => {
    expect(registerPage).toContain("skinType: 'NOT_SURE'")
    expect(registerPage).not.toContain("if (!form.skinType)")
    expect(registerPage).toContain("phone: ''")
    expect(registerPage).toContain('<input required type="tel"')
    expect(registerPage).toContain('role="alert"')
  })
})
