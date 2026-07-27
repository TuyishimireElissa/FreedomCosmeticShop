import { db } from '@/lib/db'

function mask(value: string | null) {
  if (!value) return null
  if (value.includes('@')) return value.replace(/^(.).*(@.*)$/, '$1***$2')
  return `${value.slice(0, 4)}***${value.slice(-2)}`
}

async function main() {
  const admins = await db.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'MANAGER'] } },
    select: { id: true, name: true, phone: true, email: true, role: true, isDeleted: true, mfaEnabled: true, mustChangePassword: true, createdAt: true },
  })
  console.log('=== PRIVILEGED ACCOUNT SUMMARY ===')
  console.log(JSON.stringify(admins.map((user) => ({ ...user, phone: mask(user.phone), email: mask(user.email) })), null, 2))
  console.log('\nTotal users in DB:', await db.user.count())
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : 'Admin check failed'); process.exitCode = 1 })
  .finally(() => db.$disconnect())
