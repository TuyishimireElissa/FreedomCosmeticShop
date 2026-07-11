/**
 * GET /api/health
 * Health check endpoint for load balancers + monitoring.
 */

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "FreedomCosmeticShop",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    currency: "RWF",
    country: "Rwanda",
    database: process.env.DATABASE_URL ? "configured" : "fallback-active",
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME || "dohoc0tmp",
  })
}
