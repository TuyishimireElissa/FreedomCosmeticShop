/**
 * Blog Detail API — get a single blog post by slug.
 *
 * GET /api/blog/:slug — returns full blog post
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const post = await db.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        isDeleted: false,
        publishedAt: { lte: new Date() },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Increment view count
    await db.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    })

    // Get related posts (same tags or most recent)
    const related = await db.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        isDeleted: false,
        id: { not: post.id },
        publishedAt: { lte: new Date() },
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
      },
    })

    const serialized = {
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    }

    return NextResponse.json({ post: serialized, related })
  } catch (error) {
    console.error("Blog detail error:", error)
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 })
  }
}
