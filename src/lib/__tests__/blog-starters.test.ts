import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const schema = read('prisma/schema.prisma')
const seed = read('src/scripts/seed-blog-starters.ts')
const listApi = read('src/app/api/blog/route.ts')
const detailApi = read('src/app/api/blog/[slug]/route.ts')
const page = read('src/app/blog/[slug]/page.tsx')
const content = read('src/components/blog/BlogPostContent.tsx')
const previews = read('src/components/home/BeautyTips.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

describe('Kinyarwanda blog starters', () => {
  it('extends the existing BlogPost model additively without a conflicting published flag', () => {
    for (const field of ['titleRw', 'excerptRw', 'contentRw', 'imageAlt', 'imageAltRw', 'category', 'authorName', 'metaTitleRw', 'metaDescriptionRw']) {
      expect(schema).toMatch(new RegExp(`\\b${field}\\b`))
    }
    expect(schema).toContain('status      String')
    expect(schema).not.toMatch(/published\s+Boolean/)
  })

  it('defines exactly three idempotent bilingual starter posts', () => {
    expect(seed.match(/^    slug:/gm)?.length).toBe(3)
    expect(seed.match(/titleRw:/g)?.length).toBe(3)
    expect(seed.match(/contentRw:/g)?.length).toBe(3)
    expect(seed).toContain('prisma.blogPost.upsert({')
    expect(seed).toContain("status: 'PUBLISHED'")
    expect(seed).toContain("new Date('2026-07-18T09:00:00.000Z')")
    expect(packageJson.scripts?.['blog:seed']).toBe('tsx src/scripts/seed-blog-starters.ts')
  })

  it('does not seed fake popularity, reviews, product availability, or medical promises', () => {
    expect(seed).not.toContain('viewCount:')
    expect(seed).not.toMatch(/reviewCount|avgRating|five.star|best seller/i)
    expect(seed).not.toMatch(/guaranteed results|cures acne|treats acne/i)
    expect(seed).toContain('Cosmetics do not diagnose or cure acne.')
    expect(seed).toContain('ntibisuzuma kandi ntibivura ibiheri')
  })

  it('removes fabricated fallback articles and metrics from the public blog API', () => {
    expect(listApi).toContain('const fallbackPosts: never[] = []')
    expect(listApi).not.toContain('viewCount: 234')
    expect(listApi).not.toContain('viewCount: 189')
    expect(listApi).not.toContain('(p: any)')
    expect(detailApi).toContain('titleRw: true')
    expect(detailApi).toContain('imageAltRw: true')
  })

  it('renders article text and image alternatives in the selected customer language', () => {
    expect(content).toContain("const useKinyarwanda = language === 'rw'")
    expect(content).toContain('post.titleRw ? post.titleRw : post.title')
    expect(content).toContain('post.contentRw ? post.contentRw : post.content')
    expect(content).toContain('post.imageAltRw || post.titleRw')
    expect(previews).toContain('post.imageAltRw || post.titleRw')
    expect(previews).toContain("t('blog.read_more')")
    expect(previews).not.toContain('Read more\n')
  })

  it('uses bilingual metadata and database dates for honest Article schema', () => {
    expect(page).toContain('post.metaTitleRw || post.titleRw || post.title')
    expect(page).toContain('post.metaDescriptionRw || post.excerptRw')
    expect(page).toContain('getArticleSchema({')
    expect(page).toContain('(post.publishedAt || post.updatedAt).toISOString()')
    expect(page).toContain('author: post.authorName')
  })

  it('marks the new Kinyarwanda UI translations as verified', () => {
    for (const key of ['label', 'section_title', 'section_subtitle', 'back_to_guides', 'read_more', 'recent', 'views']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
