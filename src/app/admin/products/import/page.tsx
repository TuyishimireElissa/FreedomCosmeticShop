import type { Metadata } from 'next'
import ProductBulkImport from '@/components/admin/ProductBulkImport'

export const metadata: Metadata = { title: 'Bulk Import' }

export default function ProductBulkImportPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ProductBulkImport />
    </div>
  )
}
