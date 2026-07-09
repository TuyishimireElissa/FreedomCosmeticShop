/**
 * /api/admin/backup
 *
 * GET  — Downloads a JSON snapshot of all business-critical tables for backup.
 *        The response is a `application/json` attachment named
 *        `freedom-backup-YYYY-MM-DD-HHMM.json`.
 *
 *        Snapshot includes:
 *          - metadata (timestamp, version, counts)
 *          - users (excluding passwordHash)
 *          - products (with category + brand names)
 *          - orders (with items + payments)
 *          - deliveries
 *          - coupons
 *          - banners
 *          - deliveryZoneSettings
 *          - staffProfiles
 *          - activityLogs (last 1000)
 *
 *        Excludes: OTPs, refresh tokens, password hashes — security-sensitive data.
 *
 * POST — Restore from a previously-downloaded backup JSON.
 *        Body: { backup: <backup-json-object> } or raw backup object in body.
 *        Mode: "preview" (dry-run, returns counts) or "apply" (writes to DB).
 *        ⚠️ Restore is destructive — it will UPSERT records based on ID.
 *        Only ADMIN role can perform backup/restore.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { logActivity } from "@/server/services/activity"
import { Prisma } from "@prisma/client"

const BACKUP_VERSION = "1.0"

interface BackupMetadata {
  version: string
  createdAt: string
  counts: Record<string, number>
}

interface BackupSnapshot {
  metadata: BackupMetadata
  users: unknown[]
  products: unknown[]
  orders: unknown[]
  deliveries: unknown[]
  coupons: unknown[]
  banners: unknown[]
  deliveryZoneSettings: unknown[]
  staffProfiles: unknown[]
  activityLogs: unknown[]
}

export async function GET(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")

    // Fetch all tables in parallel (with sensible limits)
    const [
      users,
      products,
      orders,
      deliveries,
      coupons,
      banners,
      deliveryZoneSettings,
      staffProfiles,
      activityLogs,
    ] = await Promise.all([
      db.user.findMany({
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          avatar: true, loyaltyPoints: true, emailVerifiedAt: true,
          isDeleted: true, deletedAt: true, createdAt: true, updatedAt: true,
          // NOTE: passwordHash intentionally excluded for security
        },
      }),
      db.product.findMany({
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
      }),
      db.order.findMany({
        include: {
          items: true,
          payments: true,
        },
        take: 5000,
      }),
      db.delivery.findMany({ take: 5000 }),
      db.coupon.findMany(),
      db.banner.findMany(),
      db.deliveryZoneSettings.findMany(),
      db.staffProfile.findMany(),
      db.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ])

    const snapshot: BackupSnapshot = {
      metadata: {
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        counts: {
          users: users.length,
          products: products.length,
          orders: orders.length,
          deliveries: deliveries.length,
          coupons: coupons.length,
          banners: banners.length,
          deliveryZoneSettings: deliveryZoneSettings.length,
          staffProfiles: staffProfiles.length,
          activityLogs: activityLogs.length,
        },
      },
      users,
      products,
      orders,
      deliveries,
      coupons,
      banners,
      deliveryZoneSettings,
      staffProfiles,
      activityLogs,
    }

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "SETTINGS",
      entityId: null,
      description: `Downloaded database backup (${users.length} users, ${products.length} products, ${orders.length} orders)`,
      severity: "critical",
      req,
    }).catch(() => {})

    const filename = `freedom-backup-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 15)}.json`

    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Backup error:", error)
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")
    const body = await req.json()

    // Accept either { backup: {...} } or raw {...}
    const snapshot: BackupSnapshot = body.backup || body
    const mode: "preview" | "apply" = body.mode === "apply" ? "apply" : "preview"

    if (!snapshot.metadata || !snapshot.metadata.version) {
      return NextResponse.json(
        { error: "Invalid backup file: missing metadata" },
        { status: 400 }
      )
    }

    if (snapshot.metadata.version !== BACKUP_VERSION) {
      return NextResponse.json(
        {
          error: `Backup version mismatch: file is v${snapshot.metadata.version}, expected v${BACKUP_VERSION}`,
        },
        { status: 400 }
      )
    }

    // Preview mode — just return counts
    if (mode === "preview") {
      return NextResponse.json({
        mode: "preview",
        metadata: snapshot.metadata,
        message: "Dry-run preview. Pass mode='apply' to restore.",
      })
    }

    // Apply mode — UPSERT records
    // ⚠️ This is destructive. We use upsert to handle both create + update.
    const results = {
      users: 0,
      products: 0,
      orders: 0,
      deliveries: 0,
      coupons: 0,
      banners: 0,
      deliveryZoneSettings: 0,
      staffProfiles: 0,
      errors: [] as string[],
    }

    // Restore in dependency order:
    // 1. Users (no FK deps)
    // 2. Categories + Brands (product deps) — skip for now, assume they exist
    // 3. Products (depend on categories/brands)
    // 4. Orders (depend on users) + OrderItems + Payments
    // 5. Deliveries (depend on orders)
    // 6. Coupons, Banners, Settings, StaffProfiles, ActivityLogs

    // 1. Users
    for (const u of snapshot.users as Prisma.UserCreateInput[]) {
      try {
        await db.user.upsert({
          where: { id: u.id },
          create: u,
          update: u,
        })
        results.users++
      } catch (e) {
        results.errors.push(`User ${u.id}: ${(e as Error).message}`)
      }
    }

    // 2. Products
    for (const p of snapshot.products as Prisma.ProductCreateInput[]) {
      try {
        // Strip relations to avoid nested create conflicts
        const { category: _c, brand: _b, ...productData } = p as Record<string, unknown>
        await db.product.upsert({
          where: { id: productData.id as string },
          create: productData as Prisma.ProductCreateInput,
          update: productData as Prisma.ProductUpdateInput,
        })
        results.products++
      } catch (e) {
        results.errors.push(`Product ${(p as { id: string }).id}: ${(e as Error).message}`)
      }
    }

    // 3. Orders
    for (const o of snapshot.orders as Prisma.OrderCreateInput[]) {
      try {
        const { items: _items, payments: _payments, ...orderData } = o as Record<string, unknown>
        await db.order.upsert({
          where: { id: orderData.id as string },
          create: orderData as Prisma.OrderCreateInput,
          update: orderData as Prisma.OrderUpdateInput,
        })
        results.orders++
      } catch (e) {
        results.errors.push(`Order ${(o as { id: string }).id}: ${(e as Error).message}`)
      }
    }

    // 4. Deliveries
    for (const d of snapshot.deliveries as Prisma.DeliveryCreateInput[]) {
      try {
        await db.delivery.upsert({
          where: { id: d.id },
          create: d,
          update: d,
        })
        results.deliveries++
      } catch (e) {
        results.errors.push(`Delivery ${d.id}: ${(e as Error).message}`)
      }
    }

    // 5. Coupons
    for (const c of snapshot.coupons as Prisma.CouponCreateInput[]) {
      try {
        await db.coupon.upsert({
          where: { id: c.id },
          create: c,
          update: c,
        })
        results.coupons++
      } catch (e) {
        results.errors.push(`Coupon ${c.id}: ${(e as Error).message}`)
      }
    }

    // 6. Banners
    for (const b of snapshot.banners as Prisma.BannerCreateInput[]) {
      try {
        await db.banner.upsert({
          where: { id: b.id },
          create: b,
          update: b,
        })
        results.banners++
      } catch (e) {
        results.errors.push(`Banner ${b.id}: ${(e as Error).message}`)
      }
    }

    // 7. Delivery zone settings
    for (const z of snapshot.deliveryZoneSettings as Prisma.DeliveryZoneSettingsCreateInput[]) {
      try {
        await db.deliveryZoneSettings.upsert({
          where: { id: z.id },
          create: z,
          update: z,
        })
        results.deliveryZoneSettings++
      } catch (e) {
        results.errors.push(`ZoneSettings ${z.id}: ${(e as Error).message}`)
      }
    }

    // 8. Staff profiles
    for (const s of snapshot.staffProfiles as Prisma.StaffProfileCreateInput[]) {
      try {
        await db.staffProfile.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        })
        results.staffProfiles++
      } catch (e) {
        results.errors.push(`StaffProfile ${s.id}: ${(e as Error).message}`)
      }
    }

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "SETTINGS",
      entityId: null,
      description: `Restored database backup: ${results.users} users, ${results.products} products, ${results.orders} orders, ${results.errors.length} errors`,
      severity: "critical",
      req,
    }).catch(() => {})

    return NextResponse.json({
      mode: "apply",
      results,
      metadata: snapshot.metadata,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Restore error:", error)
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 })
  }
}
