export const dynamic = 'force-dynamic'

/**
 * GET /api/blog - with fallback
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const fallbackPosts: never[] = []


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get("limit") || "3"), 20)

    try {
      const posts = await db.blogPost.findMany({
        where: { status: "PUBLISHED", isDeleted: false, publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
        take: limit,
      })
      if (posts.length === 0) {
        return NextResponse.json({ posts: fallbackPosts.slice(0, limit), _source: "fallback-empty" })
      }
      const serialized = posts.map((post) => ({ ...post, tags: safeTags(post.tags) }))
      return NextResponse.json({ posts: serialized, _source: "database" })
    } catch (dbErr) {
      console.warn("Blog DB failed, fallback:", dbErr)
      return NextResponse.json({ posts: fallbackPosts.slice(0, limit), _source: "fallback-error" })
    }
  } catch (error) {
    console.error("Failed to fetch blog posts:", error)
    return NextResponse.json({ posts: fallbackPosts })
  }
}

function safeTags(value: string | null) {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}
