import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ log: ['error'] })

const admins = [
  { phone: '+250790215965', email: 'admin@freedomcosmeticshop.rw', name: 'Freedom Admin', role: 'SUPER_ADMIN' },
  { phone: '+250785361796', email: 'backup@freedomcosmeticshop.rw', name: 'Freedom Admin Backup', role: 'ADMIN' },
] as const

const categories = [
  { name: 'Skincare', slug: 'skincare', sortOrder: 1 },
  { name: 'Makeup', slug: 'makeup', sortOrder: 2 },
  { name: 'Haircare', slug: 'haircare', sortOrder: 3 },
  { name: 'Hair Care', slug: 'hair-care', sortOrder: 4 },
  { name: 'Fragrance', slug: 'fragrance', sortOrder: 5 },
  { name: 'Body Care', slug: 'body-care', sortOrder: 6 },
  { name: "Men's Grooming", slug: 'mens-grooming', sortOrder: 7 },
] as const

const brands = [
  { name: 'Freedom Glow', slug: 'freedom-glow' },
  { name: 'Freedom Pure', slug: 'freedom-pure' },
  { name: 'Freedom Mane', slug: 'freedom-mane' },
  { name: 'Freedom Color', slug: 'freedom-color' },
  { name: 'Nivea', slug: 'nivea' },
  { name: "L'Oreal", slug: 'loreal' },
] as const

const deliveryZones = [
  { zoneName: 'Kigali Same Day', zoneCode: 'KIGALI_SAME_DAY', baseFee: 1000, freeThreshold: 50000, estimatedDays: 1, isSameDay: true, sameDayCutoff: '14:00' },
  { zoneName: 'Northern Province', zoneCode: 'NORTHERN', baseFee: 3000, freeThreshold: 50000, estimatedDays: 3, isSameDay: false, sameDayCutoff: null },
  { zoneName: 'Southern Province', zoneCode: 'SOUTHERN', baseFee: 3000, freeThreshold: 50000, estimatedDays: 3, isSameDay: false, sameDayCutoff: null },
  { zoneName: 'Eastern Province', zoneCode: 'EASTERN', baseFee: 3500, freeThreshold: 50000, estimatedDays: 3, isSameDay: false, sameDayCutoff: null },
  { zoneName: 'Western Province', zoneCode: 'WESTERN', baseFee: 4000, freeThreshold: 50000, estimatedDays: 4, isSameDay: false, sameDayCutoff: null },
] as const

const coupons = [
  { code: 'BEAUTY20', description: '20% off qualifying orders', value: 20, minOrderAmount: 10000, maxDiscountAmount: 15000 },
  { code: 'FREEDOM10', description: '10% off qualifying orders', value: 10, minOrderAmount: 5000, maxDiscountAmount: null },
] as const

function requiredAdminPassword(): string {
  const password = process.env.ADMIN_SEED_PASSWORD || ''
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters and include upper, lower, number, and symbol characters')
  }
  return password
}

async function seedAdmins(password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  const now = new Date()
  for (const admin of admins) {
    await prisma.user.upsert({
      where: { phone: admin.phone },
      update: { name: admin.name, email: admin.email, role: admin.role, passwordHash, emailVerifiedAt: now, failedLoginCount: 0, lockedUntil: null, mustChangePassword: true, isDeleted: false, deletedAt: null, isTestAccount: false, mfaEnabled: false },
      create: { ...admin, passwordHash, emailVerifiedAt: now, failedLoginCount: 0, lockedUntil: null, mustChangePassword: true, isDeleted: false, isTestAccount: false, mfaEnabled: false },
    })
  }
}

async function seedFoundation() {
  const password = requiredAdminPassword()
  await seedAdmins(password)

  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, update: { name: category.name, sortOrder: category.sortOrder, isActive: true, isDeleted: false, deletedAt: null }, create: { ...category, isActive: true } })
  }
  for (const brand of brands) {
    await prisma.brand.upsert({ where: { slug: brand.slug }, update: { name: brand.name, isActive: true, isDeleted: false, deletedAt: null }, create: { ...brand, isActive: true } })
  }
  for (const zone of deliveryZones) {
    await prisma.deliveryZoneSettings.upsert({ where: { zoneCode: zone.zoneCode }, update: { ...zone, isActive: true }, create: { ...zone, isActive: true } })
  }

  const settings = await prisma.storeSettings.findFirst({ select: { id: true } })
  const storeData = { storeName: 'FreedomCosmeticShop', storeShortName: 'Freedom Cosmetic', storeTagline: "Rwanda's Beauty Freedom", currency: 'RWF', timezone: 'Africa/Kigali', language: 'rw' }
  if (settings) await prisma.storeSettings.update({ where: { id: settings.id }, data: storeData })
  else await prisma.storeSettings.create({ data: storeData })

  const now = new Date()
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { ...coupon, type: 'PERCENTAGE', isActive: true },
      create: { ...coupon, type: 'PERCENTAGE', startsAt: now, isActive: true },
    })
  }
}

seedFoundation()
  .then(() => process.stdout.write('Foundation seed completed successfully.\n'))
  .catch((error: unknown) => { process.stderr.write(`Foundation seed failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`); process.exitCode = 1 })
  .finally(async () => prisma.$disconnect())
