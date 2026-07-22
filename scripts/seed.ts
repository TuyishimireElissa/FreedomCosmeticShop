import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ log: ['error'] })
const ADMIN_PHONE = '+250790215965'

const categories = [
  { name: 'Skincare', slug: 'skincare', sortOrder: 1 },
  { name: 'Makeup', slug: 'makeup', sortOrder: 2 },
  { name: 'Hair Care', slug: 'haircare', sortOrder: 3 },
  { name: 'Fragrance', slug: 'fragrance', sortOrder: 4 },
  { name: 'Body Care', slug: 'bodycare', sortOrder: 5 },
] as const

const deliveryZones = [
  { zoneName: 'Kigali City', zoneCode: 'KIGALI', baseFee: 1000, freeThreshold: 50000, estimatedDays: 1, isSameDay: true, sameDayCutoff: '14:00' },
  { zoneName: 'Northern Province', zoneCode: 'NORTHERN', baseFee: 3000, freeThreshold: 50000, estimatedDays: 3, isSameDay: false, sameDayCutoff: null },
  { zoneName: 'Southern Province', zoneCode: 'SOUTHERN', baseFee: 3000, freeThreshold: 50000, estimatedDays: 3, isSameDay: false, sameDayCutoff: null },
  { zoneName: 'Eastern Province', zoneCode: 'EASTERN', baseFee: 3500, freeThreshold: 50000, estimatedDays: 3, isSameDay: false, sameDayCutoff: null },
  { zoneName: 'Western Province', zoneCode: 'WESTERN', baseFee: 4000, freeThreshold: 50000, estimatedDays: 4, isSameDay: false, sameDayCutoff: null },
] as const

function requiredAdminPassword(): string {
  const password = process.env.ADMIN_SEED_PASSWORD || ''
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters and include upper, lower, number, and symbol characters')
  }
  return password
}

async function seedAdmin(password: string) {
  const existing = await prisma.user.findUnique({ where: { phone: ADMIN_PHONE }, select: { id: true, passwordHash: true } })
  const shouldSetPassword = !existing?.passwordHash || process.env.SEED_RESET_ADMIN_PASSWORD === 'true'
  const passwordHash = shouldSetPassword ? await bcrypt.hash(password, 12) : undefined

  await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: {
      role: 'SUPER_ADMIN',
      isDeleted: false,
      deletedAt: null,
      ...(passwordHash ? { passwordHash, passwordChangedAt: new Date(), mustChangePassword: true } : {}),
    },
    create: {
      name: 'FreedomCosmeticShop Administrator',
      phone: ADMIN_PHONE,
      role: 'SUPER_ADMIN',
      passwordHash: passwordHash || await bcrypt.hash(password, 12),
      mustChangePassword: true,
    },
  })
}

async function seedFoundation() {
  const password = requiredAdminPassword()
  await seedAdmin(password)

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder, isActive: true, isDeleted: false, deletedAt: null },
      create: { ...category, isActive: true },
    })
  }

  for (const zone of deliveryZones) {
    await prisma.deliveryZoneSettings.upsert({
      where: { zoneCode: zone.zoneCode },
      update: { ...zone, isActive: true },
      create: { ...zone, isActive: true },
    })
  }

  const settings = await prisma.storeSettings.findFirst({ select: { id: true } })
  if (settings) {
    await prisma.storeSettings.update({
      where: { id: settings.id },
      data: { storeName: 'FreedomCosmeticShop', currency: 'RWF', timezone: 'Africa/Kigali' },
    })
  } else {
    await prisma.storeSettings.create({
      data: { storeName: 'FreedomCosmeticShop', currency: 'RWF', timezone: 'Africa/Kigali', language: 'rw' },
    })
  }
}

seedFoundation()
  .then(() => process.stdout.write('Foundation seed completed successfully.\n'))
  .catch((error: unknown) => {
    process.stderr.write(`Foundation seed failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
