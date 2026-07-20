export const dynamic = 'force-dynamic'

/**
 * POST   /api/settings/logo — admin uploads a logo image file
 * DELETE /api/settings/logo — admin removes the current logo
 *
 * The logo is saved to /public/uploads/logos/ and served from there.
 * No Cloudinary needed — uses local filesystem.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { writeFile, mkdir, unlink } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { logActivity } from "@/server/services/activity"
import { emitRealtimeEvent } from "@/lib/event-bus"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")

    const formData = await req.formData()
    const file = formData.get("logo") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided. Please select a logo image." }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only JPG, PNG, WebP, and SVG are allowed.` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 5MB.` },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "logos")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png"
    const filename = `logo-${Date.now()}.${ext}`
    const filepath = path.join(uploadDir, filename)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Public URL path
    const logoUrl = `/uploads/logos/${filename}`

    // Get current settings to delete old logo
    let settings = await db.storeSettings.findFirst()
    if (!settings) {
      settings = await db.storeSettings.create({ data: {} })
    }

    // Delete old logo file if exists
    if (settings.logoUrl) {
      const oldPath = path.join(process.cwd(), "public", settings.logoUrl)
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {})
      }
    }

    // Update database
    const updated = await db.storeSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl,
        logoUpdatedAt: new Date(),
      },
    })

    // Emit real-time event so all clients update their logo
    emitRealtimeEvent("logo:updated", { logoUrl, storeName: updated.storeName }, { source: adminUser.name })

    // Audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "SETTINGS",
      entityId: settings.id,
      description: `Uploaded new shop logo: ${filename}`,
      req,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      logoUrl,
      message: "Logo uploaded successfully! It's now live everywhere.",
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Logo upload error:", error)
    return NextResponse.json({ error: "Failed to upload logo. Please try again." }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const adminUser = await requireRole("ADMIN")

    const settings = await db.storeSettings.findFirst()
    if (!settings) {
      return NextResponse.json({ error: "No settings found" }, { status: 404 })
    }

    // Delete logo file from disk
    if (settings.logoUrl) {
      const filepath = path.join(process.cwd(), "public", settings.logoUrl)
      if (existsSync(filepath)) {
        await unlink(filepath).catch(() => {})
      }
    }

    // Update database
    await db.storeSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: null,
        logoUpdatedAt: null,
      },
    })

    // Emit real-time event
    emitRealtimeEvent("logo:updated", { logoUrl: null, storeName: settings.storeName }, { source: adminUser.name })

    // Audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "SETTINGS",
      entityId: settings.id,
      description: "Removed shop logo (reverted to text)",
    }).catch(() => {})

    return NextResponse.json({ success: true, message: "Logo removed. Showing text logo." })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Logo delete error:", error)
    return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 })
  }
}
