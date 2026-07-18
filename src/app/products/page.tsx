import type { Metadata } from 'next'
import ProductsPageClient from '@/components/products/ProductsPageClient'
import StructuredData from '@/components/seo/StructuredData'
import { getPageMetadata, type LocalizedSEOText } from '@/lib/seo-config'
import { getBreadcrumbSchema } from '@/lib/structured-data'

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

export default async function ProductsPage({ searchParams }: { searchParams: ProductsSearchParams }) {
  const params = await searchParams
  const category = firstValue(params.category).toLowerCase()
  const categorySEO = CATEGORY_SEO[category]
  const breadcrumbs = [
    { name: 'Ahabanza', url: '/' }, // verified-rw
    { name: 'Ibicuruzwa', url: '/products' }, // verified-rw
    ...(categorySEO ? [{ name: categorySEO.label, url: `/products?category=${encodeURIComponent(category)}` }] : []),
  ]

  return (
    <>
      <StructuredData data={getBreadcrumbSchema(breadcrumbs)} />
      <ProductsPageClient />
    </>
  )
}
