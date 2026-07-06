/**
 * POST /api/seed
 *
 * Re-seeds the database by running the seed script logic inline.
 * Useful for resetting the demo to a known state.
 *
 * In production this would be removed or protected behind admin auth.
 */
import { NextResponse } from "next/server"
import { execSync } from "child_process"

export async function POST() {
  try {
    execSync("bun run /home/z/my-project/scripts/seed.ts", {
      stdio: "pipe",
      timeout: 30000,
    })
    return NextResponse.json({ ok: true, message: "Database re-seeded" })
  } catch (error) {
    console.error("Seed failed:", error)
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    )
  }
}
