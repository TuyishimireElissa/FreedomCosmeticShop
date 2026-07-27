import BundleDetailView from '@/components/bundles/BundleDetailView'

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <BundleDetailView slug={slug} />
}
