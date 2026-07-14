import crypto from 'crypto'
import QRCode from 'qrcode'
import speakeasy from 'speakeasy'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const ISSUER = 'FreedomCosmeticShop Admin'
const CHALLENGE_TTL_SECONDS = 5 * 60

function securityKey(): Buffer {
  const value = process.env.MFA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  if (!value || value.length < 32) {
    throw new Error('MFA security key is not configured')
  }
  return crypto.createHash('sha256').update(value).digest()
}

function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', securityKey(), iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

function decryptSecret(payload: string): string {
  const [ivValue, tagValue, encryptedValue] = payload.split('.')
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid MFA secret')
  const decipher = crypto.createDecipheriv('aes-256-gcm', securityKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function backupCodeHash(code: string): string {
  return crypto.createHmac('sha256', securityKey()).update(code.toUpperCase().replace(/\s/g, '')).digest('hex')
}

function challengeSecret(): Uint8Array {
  return new Uint8Array(securityKey())
}

export class MFAService {
  static generateSecret(identifier: string) {
    return speakeasy.generateSecret({
      name: `FreedomCosmeticShop:${identifier}`,
      issuer: ISSUER,
      length: 20,
    })
  }

  static async generateQRCode(otpauthUrl: string): Promise<string> {
    if (!otpauthUrl) throw new Error('Missing authenticator URL')
    return QRCode.toDataURL(otpauthUrl, { errorCorrectionLevel: 'M', margin: 1, width: 320 })
  }

  static generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => {
      const value = crypto.randomBytes(4).toString('hex').toUpperCase()
      return `${value.slice(0, 4)}-${value.slice(4)}`
    })
  }

  static verifyTOTP(token: string, encryptedSecret: string): boolean {
    if (!/^\d{6}$/.test(token)) return false
    return speakeasy.totp.verify({
      secret: decryptSecret(encryptedSecret),
      encoding: 'base32',
      token,
      window: 1,
    })
  }

  static async beginSetup(userId: string, identifier: string) {
    const secret = this.generateSecret(identifier)
    if (!secret.base32 || !secret.otpauth_url) throw new Error('Could not generate MFA secret')
    const backupCodes = this.generateBackupCodes()
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: encryptSecret(secret.base32),
        mfaBackupCodes: backupCodes.map(backupCodeHash),
      },
    })
    return {
      secret: secret.base32,
      qrCode: await this.generateQRCode(secret.otpauth_url),
      backupCodes,
    }
  }

  static async confirmSetup(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    })
    if (!user?.mfaSecret || !this.verifyTOTP(token, user.mfaSecret)) return false
    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } })
    return true
  }

  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const expected = backupCodeHash(code)
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { mfaBackupCodes: true },
      })
      if (!user) return false
      const index = user.mfaBackupCodes.findIndex((stored) => {
        const left = Buffer.from(stored, 'hex')
        const right = Buffer.from(expected, 'hex')
        return left.length === right.length && timingSafeEqual(left, right)
      })
      if (index < 0) return false
      const remaining = [...user.mfaBackupCodes]
      remaining.splice(index, 1)
      await tx.user.update({ where: { id: userId }, data: { mfaBackupCodes: remaining } })
      return true
    })
  }

  static async disableMFA(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
    })
  }

  static async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } })
    return user?.mfaEnabled ?? false
  }

  static async createLoginChallenge(userId: string): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('base64url')
    const verification = await prisma.mFAVerification.create({
      data: {
        userId,
        code: crypto.createHash('sha256').update(nonce).digest('hex'),
        type: 'TOTP_LOGIN',
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000),
      },
    })
    return new SignJWT({ purpose: 'admin-mfa', userId, verificationId: verification.id, nonce })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${CHALLENGE_TTL_SECONDS}s`)
      .setIssuer('freedom-cosmetic-shop')
      .setAudience('freedom-admin-mfa')
      .sign(challengeSecret())
  }

  static async verifyLoginChallenge(challengeToken: string, code: string) {
    const { payload } = await jwtVerify(challengeToken, challengeSecret(), {
      issuer: 'freedom-cosmetic-shop',
      audience: 'freedom-admin-mfa',
    })
    if (payload.purpose !== 'admin-mfa' || typeof payload.userId !== 'string' || typeof payload.verificationId !== 'string' || typeof payload.nonce !== 'string') {
      return null
    }
    const verification = await prisma.mFAVerification.findUnique({ where: { id: payload.verificationId } })
    const nonceHash = crypto.createHash('sha256').update(payload.nonce).digest('hex')
    if (!verification || verification.userId !== payload.userId || verification.isUsed || verification.expiresAt <= new Date() || verification.code !== nonceHash) return null
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { mfaEnabled: true, mfaSecret: true } })
    if (!user?.mfaEnabled || !user.mfaSecret) return null
    const valid = /^\d{6}$/.test(code)
      ? this.verifyTOTP(code, user.mfaSecret)
      : await this.verifyBackupCode(payload.userId, code)
    if (!valid) return null
    const marked = await prisma.mFAVerification.updateMany({ where: { id: verification.id, isUsed: false }, data: { isUsed: true } })
    return marked.count === 1 ? payload.userId : null
  }
}

function timingSafeEqual(left: Buffer, right: Buffer): boolean {
  return crypto.timingSafeEqual(left, right)
}
