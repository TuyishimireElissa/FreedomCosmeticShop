import BundleDetailView from '@/components/bundles/BundleDetailView'

export default function BundlePage({ params }: { params: { slug: string } }) {
  return <BundleDetailView slug={params.slug} />
}
