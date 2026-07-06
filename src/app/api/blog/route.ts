/**
 * GET /api/blog
 *
 * Returns published blog posts for the beauty tips section.
 * Query params:
 *   - limit: number of posts (default 3)
 *
 * Only returns published posts. Sorted by publishedAt descending.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get("limit") || "3"), 20)

    const posts = await db.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        isDeleted: false,
        publishedAt: { lte: new Date() },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
    })

    // Deserialize tags (JSON string in SQLite)
    const serialized = posts.map((p) => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : [],
    }))

    return NextResponse.json({ posts: serialized })
  } catch (error) {
    console.error("Failed to fetch blog posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    )
  }
}
