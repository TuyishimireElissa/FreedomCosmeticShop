export const dynamic = 'force-dynamic'

/**
 * /api/admin/staff/[id]
 *
 * PATCH — Update a staff user's role, department, position, permissions, or
 *         active status. Cannot delete staff (use isDeleted on the User instead,
 *         which is what setting isActive=false on StaffProfile approximates).
 *
 * Body (all fields optional):
 *   - role?: "ADMIN" | "STAFF" | "MANAGER"
 *   - department?: string
 *   - position?: string
 *   - permissions?: string[]
 *   - isActive?: boolean
 *   - resetPassword?: string (new plaintext password, min 8 chars)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, hashPassword } from "@/lib/auth"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const UpdateStaffSchema = z.object({
  role: z.enum(["ADMIN", "STAFF", "MANAGER"]).optional(),
  department: z
    .enum(["SALES", "MARKETING", "LOGISTICS", "SUPPORT", "FINANCE", "MANAGEMENT"])
    .optional(),
  position: z.string().min(2).max(100).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.string().min(8).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole("ADMIN")
    const { id } = await params
    const body = await req.json()

    const parsed = UpdateStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Find the staff user
    const existing = await db.user.findFirst({
      where: { id, role: { in: ["ADMIN", "STAFF", "MANAGER"] } },
      include: { staffProfile: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Staff user not found" }, { status: 404 })
    }

    const changes: string[] = []
    const userData: Record<string, unknown> = {}
    const profileData: Record<string, unknown> = {}

    if (parsed.data.role && parsed.data.role !== existing.role) {
      userData.role = parsed.data.role
      changes.push(`role: ${existing.role} → ${parsed.data.role}`)
    }
    if (parsed.data.department && existing.staffProfile) {
      profileData.department = parsed.data.department
      changes.push(`department: ${parsed.data.department}`)
    }
    if (parsed.data.position && existing.staffProfile) {
      profileData.position = parsed.data.position
      changes.push(`position: ${parsed.data.position}`)
    }
    if (parsed.data.permissions && existing.staffProfile) {
      profileData.permissions = JSON.stringify(parsed.data.permissions)
      changes.push(`permissions: ${parsed.data.permissions.length} items`)
    }
    if (typeof parsed.data.isActive === "boolean" && existing.staffProfile) {
      profileData.isActive = parsed.data.isActive
      changes.push(`isActive: ${parsed.data.isActive}`)
    }
    if (parsed.data.resetPassword) {
      userData.passwordHash = await hashPassword(parsed.data.resetPassword)
      changes.push("password reset")
    }

    // Apply updates
    if (Object.keys(userData).length > 0) {
      await db.user.update({ where: { id }, data: userData })
    }
    if (Object.keys(profileData).length > 0 && existing.staffProfile) {
      await db.staffProfile.update({
        where: { userId: id },
        data: profileData,
      })
    }

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "STAFF_UPDATE",
      entityType: "STAFF",
      entityId: id,
      description: `Updated staff ${existing.name}: ${changes.join(", ") || "no changes"}`,
      severity: changes.includes("password reset") ? "critical" : "warn",
      req,
    }).catch(() => {})

    // Return the updated user
    const updated = await db.user.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        staffProfile: true,
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Staff update error:", error)
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 })
  }
}
