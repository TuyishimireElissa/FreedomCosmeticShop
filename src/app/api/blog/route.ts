/**
 * GET /api/blog - with fallback
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const fallbackPosts = [
  {
    id: "post_1",
    title: "5 Skincare Tips for Rwanda's Climate",
    slug: "skincare-tips-rwanda-climate",
    excerpt: "Rwanda's high UV index and varying humidity call for a tailored skincare routine. Here's what works.",
    content: "Rwanda's climate is beautiful but demanding on your skin...",
    coverImage: "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=800&auto=format&fit=crop",
    tags: ["skincare", "sunscreen", "rwanda"],
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    viewCount: 234,
  },
  {
    id: "post_2",
    title: "How to Build a Curly Hair Routine",
    slug: "curly-hair-routine-guide",
    excerpt: "A step-by-step guide to building a curly hair routine that works for textured and coily hair types.",
    content: "Curly hair needs moisture, definition, and gentle care...",
    coverImage: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop",
    tags: ["haircare", "curly hair", "routine"],
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    viewCount: 189,
  }
]

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
      const serialized = posts.map((p: any) => ({ ...p, tags: p.tags ? JSON.parse(p.tags) : [] }))
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
