import type { Metadata } from 'next'
import ProductsPageClient from '@/components/products/ProductsPageClient'
import StructuredData from '@/components/seo/StructuredData'
import { getPageMetadata, type LocalizedSEOText } from '@/lib/seo-config'
import { prisma } from '@/lib/prisma'
import { getBreadcrumbSchema, getCollectionPageSchema } from '@/lib/structured-data'

const CATEGORY_SEO: Record<string, { title: LocalizedSEOText; label: string }> = {
  skincare: {
    title: { en: 'Skincare Products in Rwanda', rw: 'Ibicuruzwa byo Kwita ku Ruhu mu Rwanda' }, // verified-rw
    label: 'Kwita ku ruhu', // verified-rw
  },
  haircare: {
    title: { en: 'Haircare Products in Rwanda', rw: 'Ibicuruzwa byo Kwita ku Musatsi mu Rwanda' }, // verified-rw
    label: 'Kwita ku musatsi', // verified-rw
  },
  makeup: {
    title: { en: 'Makeup Products in Rwanda', rw: 'Ibikoresho byo Kwisiga mu Rwanda' }, // verified-rw
    label: 'Ibikoresho byo kwisiga', // verified-rw
  },
  fragrance: {
    title: { en: 'Fragrances in Rwanda', rw: 'Imibavu mu Rwanda' }, // verified-rw
    label: 'Imibavu', // verified-rw
  },
  'body-care': {
    title: { en: 'Body Care Products in Rwanda', rw: 'Ibicuruzwa byo Kwita ku Mubiri mu Rwanda' }, // verified-rw
    label: 'Kwita ku mubiri', // verified-rw
  },
}

type ProductsSearchParams = Promise<Record<string, string | string[] | undefined>>

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value || '').trim().slice(0, 100)
}

export async function generateMetadata({ searchParams }: { searchParams: ProductsSearchParams }): Promise<Metadata> {
  const params = await searchParams
  const search = firstValue(params.search || params.q)
  const category = firstValue(params.category).toLowerCase()

  if (search) {
    const encodedSearch = encodeURIComponent(search)
    return getPageMetadata({
      title: {
        en: `Search results for “${search}”`,
        rw: `Ibisubizo by’ishakisha rya “${search}”`, // verified-rw
      },
      description: {
        en: `Browse current FreedomCosmeticShop catalogue results for “${search}” in Rwanda.`,
        rw: `Reba ibicuruzwa biri ku rutonde rwa FreedomCosmeticShop bihuye na “${search}” mu Rwanda.`, // verified-rw
      },
      path: `/products?search=${encodedSearch}`,
      noIndex: true,
    })
  }

  const categorySEO = CATEGORY_SEO[category]
  if (categorySEO) {
    return getPageMetadata({
      title: categorySEO.title,
      description: {
        en: `Browse current ${categorySEO.title.en.toLowerCase()} with prices in RWF and delivery information for Rwanda.`,
        rw: `Reba ${categorySEO.title.rw.toLowerCase()} biriho, ibiciro mu RWF n’amakuru yo kubigeza mu Rwanda.`, // verified-rw
      },
      path: `/products?category=${encodeURIComponent(category)}`,
    })
  }

  return getPageMetadata({
    title: {
      en: 'Beauty Products in Rwanda | FreedomCosmeticShop',
      rw: 'Ibicuruzwa by’Ubwiza mu Rwanda | FreedomCosmeticShop', // verified-rw
    },
    description: {
      en: 'Browse the current FreedomCosmeticShop catalogue of skincare, makeup, haircare and other beauty products with prices in RWF.',
      rw: 'Reba urutonde rwa FreedomCosmeticShop rw’ibita ku ruhu, ibikoresho byo kwisiga, ibita ku musatsi n’ibindi bicuruzwa by’ubwiza bifite ibiciro mu RWF.', // verified-rw
    },
    path: '/products',
  })
}

/**
 * Shelf contents, read on the server.
 *
 * ProductsPageClient builds an ItemList too, but it is a client component that
 * loads through fetch() inside useEffect, so that schema never reaches the
 * server HTML. Verified on the live category page: zero product names in the
 * SSR payload. Google's structured-data crawler does not run that JavaScript,
 * so the client copy is effectively invisible and this server copy is the one
 * that will actually be read.
 *
 * Only the first 20 are listed. The full count still goes out as
 * numberOfItems, and a several-hundred-entry list would bloat every category
 * page for readers on 3G.
 */
const COLLECTION_SAMPLE_SIZE = 20

async function getCollection(categorySlug: string) {
  if (!categorySlug) return null
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, isActive: true, isDeleted: false },
    select: { name: true, nameRw: true, slug: true, description: true },
  })
  if (!category) return null

  const where = {
    isActive: true,
    isDeleted: false,
    category: { slug: categorySlug },
  }
  const [totalItems, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: { name: true, slug: true, price: true, images: true },
      orderBy: { updatedAt: 'desc' },
      take: COLLECTION_SAMPLE_SIZE,
    }),
  ])
  // An empty shelf gets no CollectionPage: telling Google a collection exists
  // and then showing nothing is worse than staying quiet.
  if (totalItems === 0) return null

  return {
    name: category.nameRw || category.name,
    description: category.description,
    url: `/products?category=${encodeURIComponent(category.slug)}`,
    totalItems,
    items: products.map((product) => ({
      name: product.name,
      url: `/products/${product.slug}`,
      image: firstImage(product.images),
      price: product.price,
    })),
  }
}

function firstImage(value: string): string | undefined {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : undefined
  } catch {
    return undefined
  }
}

export default async function ProductsPage({ searchParams }: { searchParams: ProductsSearchParams }) {
  const params = await searchParams
  const category = firstValue(params.category).toLowerCase()
  const search = firstValue(params.search || params.q)
  const categorySEO = CATEGORY_SEO[category]
  // Search results are noindex, so schema there would describe a page Google
  // is told not to keep.
  const collection = search ? null : await getCollection(category).catch(() => null)
  const breadcrumbs = [
    { name: 'Ahabanza', url: '/' }, // verified-rw
    { name: 'Ibicuruzwa', url: '/products' }, // verified-rw
    // Falls back to the database name so shelves outside the hand-written
    // CATEGORY_SEO map still get a crumb. Soap is the second-largest category
    // on the site with 33 live products and was silently missing one.
    ...(categorySEO || collection
      ? [{
        name: categorySEO?.label || collection?.name || category,
        url: `/products?category=${encodeURIComponent(category)}`,
      }]
      : []),
  ]

  const schemas = [
    getBreadcrumbSchema(breadcrumbs),
    ...(collection ? [getCollectionPageSchema(collection)] : []),
  ]

  return (
    <>
      <StructuredData data={schemas} />
      <ProductsPageClient />
    </>
  )
}
