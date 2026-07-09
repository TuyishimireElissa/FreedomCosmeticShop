/**
 * Reset the admin user's password to a known value.
 *
 * Usage: npx tsx scripts/reset-admin-password.ts
 *
 * This script finds the existing admin user (Test User, +250788123456)
 * and sets their password to "Admin@2026" so you can log in.
 *
 * After first login, change the password via the admin profile.
 */

import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

const NEW_PASSWORD = "Admin@2026"
const ADMIN_PHONE = "+250788123456"

async function main() {
  const admin = await db.user.findFirst({
    where: { phone: ADMIN_PHONE, role: { in: ["ADMIN", "STAFF", "MANAGER"] } },
    select: { id: true, name: true, phone: true, email: true, role: true, passwordHash: true },
  })

  if (!admin) {
    console.error(`❌ No admin user found with phone ${ADMIN_PHONE}`)
    console.log("\nExisting users:")
    const users = await db.user.findMany({ select: { name: true, phone: true, role: true } })
    console.log(JSON.stringify(users, null, 2))
    process.exit(1)
  }

  console.log("=== FOUND ADMIN USER ===")
  console.log(`  ID:    ${admin.id}`)
  console.log(`  Name:  ${admin.name}`)
  console.log(`  Phone: ${admin.phone}`)
  console.log(`  Email: ${admin.email || "(none)"}`)
  console.log(`  Role:  ${admin.role}`)
  console.log(`  Has password hash: ${!!admin.passwordHash}`)

  // Reset password
  const newHash = await hashPassword(NEW_PASSWORD)
  await db.user.update({
    where: { id: admin.id },
    data: { passwordHash: newHash },
  })

  console.log("\n✅ Password reset successfully!")
  console.log("\n=== LOGIN CREDENTIALS ===")
  console.log(`  Phone:    ${admin.phone}`)
  console.log(`  Password: ${NEW_PASSWORD}`)
  console.log(`  Role:     ${admin.role}`)
  console.log("\n⚠️  Change this password after first login via the admin profile menu.")

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
