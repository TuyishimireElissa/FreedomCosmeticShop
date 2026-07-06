/**
 * GET /api/health
 * Health check endpoint for load balancers + monitoring.
 * Returns { status: "ok", timestamp, uptime, version }
 */
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  })
}
