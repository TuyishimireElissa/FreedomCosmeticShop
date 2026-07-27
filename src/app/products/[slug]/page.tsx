import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import StructuredData from '@/components/seo/StructuredData'
import { getPageMetadata } from '@/lib/seo-config'
import { getBreadcrumbSchema, getProductSchema } from '@/lib/structured-data'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true, isDeleted: false },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      price: true,
      stock: true,
      sku: true,
      barcode: true,
      images: true,
      productImages: {
        select: { url: true, isPrimary: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
      brand: { select: { name: true } },
      category: { select: { name: true, slug: true } },
      reviews: {
        where: { isApproved: true, isVerified: true, isHidden: false, isDeleted: false },
        select: { rating: true },
      },
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug).catch(() => null)
  if (!product) {
    return getPageMetadata({
      title: { en: 'Product not found', rw: 'Igicuruzwa nticyabonetse' }, // verified-rw
      description: { en: 'This product is not available in the current catalogue.', rw: 'Iki gicuruzwa ntikiboneka ku rutonde rw’ibicuruzwa biriho.' }, // verified-rw
      path: `/products/${encodeURIComponent(slug)}`,
      noIndex: true,
    })
  }
  const images = getMetadataImages(product)
  const englishDescription = (product.shortDescription || product.description).slice(0, 160)
  return getPageMetadata({
    title: {
      en: `${product.name} | Buy Online in Rwanda`,
      rw: `${product.name} | Gura mu Rwanda`, // verified-rw
    },
    description: {
      en: englishDescription,
      rw: `Gura ${product.name} mu Rwanda. Reba igiciro kiriho mu RWF, amakuru y’igicuruzwa n’uburyo bwo kukigezaho.`, // verified-rw
    },
    path: `/products/${product.slug}`,
    image: images[0],
  })
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug).catch(() => null)
  if (!product) return <ProductDetailClient slug={slug} />

  const reviews = product.reviews
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0
  const productSchema = getProductSchema({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.shortDescription || product.description,
    price: product.price,
    images: getMetadataImages(product),
    stockQuantity: product.stock,
    sku: product.sku,
    brand: product.brand,
    aggregateRating: reviews.length > 0
      ? { average, count: reviews.length, source: 'database' }
      : undefined,
    gtin: getKnownGTIN(product.barcode),
  })
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Ahabanza', url: '/' }, // verified-rw
    { name: 'Ibicuruzwa', url: '/products' }, // verified-rw
    { name: product.category.name, url: `/products?category=${encodeURIComponent(product.category.slug)}` },
    { name: product.name, url: `/products/${product.slug}` },
  ])

  return (
    <>
      <StructuredData data={[productSchema, breadcrumbSchema]} />
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[
          { name: 'Ibicuruzwa', url: '/products' }, // verified-rw
          { name: product.category.name, url: `/products?category=${encodeURIComponent(product.category.slug)}` },
          { name: product.name, url: `/products/${product.slug}` },
        ]} />
      </div>
      <ProductDetailClient slug={slug} />
    </>
  )
}

function getKnownGTIN(barcode: string | null) {
  const value = barcode?.replace(/\D/g, '') || ''
  if (value.length === 8) return { type: 'gtin8' as const, value }
  if (value.length === 12) return { type: 'gtin12' as const, value }
  if (value.length === 13) return { type: 'gtin13' as const, value }
  if (value.length === 14) return { type: 'gtin14' as const, value }
  return undefined
}

function parseImages(value: string): string[] {
  try { const images = JSON.parse(value); return Array.isArray(images) ? images : [] } catch { return [] }
}

function getMetadataImages(product: { images: string; productImages: Array<{ url: string; isPrimary: boolean; sortOrder: number }> }) {
  if (product.productImages.length > 0) {
    return [...product.productImages]
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.sortOrder - right.sortOrder)
      .map((image) => image.url)
  }
  return parseImages(product.images)
}
