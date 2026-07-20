import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { normalizeRwandaPhone } from '@/lib/phone'

const BCRYPT_COST = 12

async function main() {
  const rawPhone = process.env.ADMIN_PHONE
  const password = process.env.ADMIN_NEW_PASSWORD
  if (!rawPhone) throw new Error('Set ADMIN_PHONE to the existing owner admin phone')
  if (!password || password.length < 12) throw new Error('Set ADMIN_NEW_PASSWORD to a private password of at least 12 characters')
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('ADMIN_NEW_PASSWORD must contain uppercase, lowercase, number, and symbol')
  }

  const phone = normalizeRwandaPhone(rawPhone)
  const admin = await db.user.findFirst({
    where: { phone, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isDeleted: false },
    select: { id: true, phone: true, role: true },
  })
  if (!admin) throw new Error('Active ADMIN or SUPER_ADMIN account not found')

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
  await db.user.update({
    where: { id: admin.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  })

  const updated = await db.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true, role: true } })
  if (!updated?.passwordHash || !(await bcrypt.compare(password, updated.passwordHash))) {
    throw new Error('Password verification failed after update')
  }

  console.log(`Password reset verified for ${admin.phone} (${updated.role}). A password change is required after login.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Admin password reset failed')
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
