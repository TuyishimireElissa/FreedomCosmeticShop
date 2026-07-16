import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import { BUSINESS } from '@/lib/business-config'

const baseUrl = BUSINESS.url

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true, isDeleted: false },
    select: {
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      price: true,
      stock: true,
      images: true,
      productImages: {
        select: { url: true, isPrimary: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
      brand: { select: { name: true } },
      reviews: {
        where: { isApproved: true, isVerified: true, isHidden: false, isDeleted: false },
        select: { rating: true },
      },
    },
  })
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug).catch(() => null)
  if (!product) return { title: 'Product not found' }
  const images = getMetadataImages(product)
  const description = product.shortDescription || product.description.slice(0, 160)
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} | ${BUSINESS.name}`,
      description,
      url: `${baseUrl}/products/${product.slug}`,
      images: images[0] ? [{ url: images[0], alt: product.name }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug).catch(() => null)
  const reviews = product?.reviews || []
  const rating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0
  const jsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    image: getMetadataImages(product),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'RWF',
      price: product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/products/${product.slug}`,
    },
    aggregateRating: reviews.length ? {
      '@type': 'AggregateRating',
      ratingValue: Math.round(rating * 10) / 10,
      reviewCount: reviews.length,
    } : undefined,
  } : null
  return <>{jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}<ProductDetailClient slug={params.slug} /></>
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
