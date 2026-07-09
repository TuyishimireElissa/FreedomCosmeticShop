import { db } from "@/lib/db"

async function main() {
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF", "MANAGER"] } },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      isDeleted: true,
      createdAt: true,
    },
  })
  console.log("=== STAFF ACCOUNTS ===")
  console.log(JSON.stringify(admins, null, 2))
  const totalUsers = await db.user.count()
  console.log("\nTotal users in DB:", totalUsers)
  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
