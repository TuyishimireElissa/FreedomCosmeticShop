import type { Metadata } from 'next'
import ReviewSubmissionForm from '@/components/reviews/ReviewSubmissionForm'

export const metadata: Metadata = { title: 'Write an Honest Review' }

export default async function ReviewPage({ params }: { params: Promise<{ orderId: string; productId: string }> }) {
  const { orderId, productId } = await params
  return <ReviewSubmissionForm orderId={orderId} productId={productId} />
}
