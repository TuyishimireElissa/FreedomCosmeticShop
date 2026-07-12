import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ProductDetailClient from '@/components/products/ProductDetailClient'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://freedom-cosmetic-shop.vercel.app'

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
      brand: { select: { name: true } },
      reviews: {
        where: { isApproved: true, isDeleted: false },
        select: { rating: true },
      },
    },
  })
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug).catch(() => null)
  if (!product) return { title: 'Product not found' }
  const images = parseImages(product.images)
  const description = product.shortDescription || product.description.slice(0, 160)
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} | FreedomCosmeticShop`,
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
    image: parseImages(product.images),
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
