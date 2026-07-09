/**
 * /api/admin/staff
 *
 * GET  — List all staff users (ADMIN / STAFF / MANAGER) with their StaffProfile.
 * POST — Create a new staff user (with role, department, position, permissions).
 *
 * Body for POST:
 *   - name: string
 *   - phone: string (Rwanda: +2507XXXXXXXX)
 *   - email?: string
 *   - password: string (min 8 chars — admin sets initial password)
 *   - role: "ADMIN" | "STAFF" | "MANAGER"
 *   - department: "SALES" | "MARKETING" | "LOGISTICS" | "SUPPORT" | "FINANCE" | "MANAGEMENT"
 *   - position: string (e.g., "Sales Associate")
 *   - permissions?: string[] (defaults based on role)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, hashPassword } from "@/lib/auth"
import { normalizeRwandaPhone } from "@/lib/phone"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const DEPARTMENTS = [
  "SALES",
  "MARKETING",
  "LOGISTICS",
  "SUPPORT",
  "FINANCE",
  "MANAGEMENT",
] as const

const STAFF_ROLES = ["ADMIN", "STAFF", "MANAGER"] as const

// Default permission sets per role.
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "orders.read", "orders.update", "orders.refund",
    "products.crud", "customers.crud", "deliveries.crud",
    "coupons.crud", "banners.crud", "sms.send", "sms.schedule",
    "analytics.read", "reports.read", "staff.manage", "settings.update",
  ],
  MANAGER: [
    "orders.read", "orders.update",
    "products.read", "products.update",
    "customers.read", "customers.update",
    "deliveries.read", "deliveries.update",
    "coupons.read", "coupons.update",
    "banners.read", "banners.update",
    "sms.send", "analytics.read", "reports.read",
  ],
  STAFF: [
    "orders.read", "orders.update",
    "products.read",
    "customers.read",
    "deliveries.read", "deliveries.update",
    "sms.send", "analytics.read",
  ],
}

const CreateStaffSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(9),
  email: z.string().email().optional(),
  password: z.string().min(8),
  role: z.enum(STAFF_ROLES),
  department: z.enum(DEPARTMENTS),
  position: z.string().min(2).max(100),
  permissions: z.array(z.string()).optional(),
})

export async function GET() {
  try {
    await requireRole("ADMIN")

    const staffUsers = await db.user.findMany({
      where: {
        role: { in: ["ADMIN", "STAFF", "MANAGER"] },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        staffProfile: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ staff: staffUsers })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Staff list error:", error)
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")
    const body = await req.json()

    const parsed = CreateStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid staff data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, phone, email, password, role, department, position, permissions } = parsed.data

    // Normalize + validate Rwanda phone
    let normalizedPhone: string
    try {
      normalizedPhone = normalizeRwandaPhone(phone)
    } catch {
      return NextResponse.json(
        { error: "Invalid Rwanda phone number. Use format +2507XXXXXXXX." },
        { status: 400 }
      )
    }

    // Check phone uniqueness
    const existingPhone = await db.user.findUnique({ where: { phone: normalizedPhone } })
    if (existingPhone && !existingPhone.isDeleted) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 400 }
      )
    }

    // Check email uniqueness if provided
    if (email) {
      const existingEmail = await db.user.findUnique({ where: { email } })
      if (existingEmail && !existingEmail.isDeleted) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        )
      }
    }

    const passwordHash = await hashPassword(password)
    const finalPermissions = permissions || DEFAULT_PERMISSIONS[role]

    // Generate employee ID: <DEPT>-YYYY-XXXX
    const year = new Date().getFullYear()
    const random = Math.floor(1000 + Math.random() * 9000)
    const employeeId = `${department.slice(0, 3)}-${year}-${random}`

    // Create user + staff profile in a transaction
    const newUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          phone: normalizedPhone,
          email: email?.trim() || null,
          passwordHash,
          role,
        },
      })

      await tx.staffProfile.create({
        data: {
          userId: user.id,
          employeeId,
          department,
          position,
          permissions: JSON.stringify(finalPermissions),
          isActive: true,
        },
      })

      return user
    })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "STAFF_CREATE",
      entityType: "STAFF",
      entityId: newUser.id,
      description: `Created staff account: ${name} (${role}, ${department})`,
      severity: "warn",
      req,
    }).catch(() => {})

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role,
        },
        employeeId,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Staff create error:", error)
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 })
  }
}
