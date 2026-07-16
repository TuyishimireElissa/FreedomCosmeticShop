import type { Metadata } from 'next'
import ReviewSubmissionForm from '@/components/reviews/ReviewSubmissionForm'

export const metadata: Metadata = { title: 'Write an Honest Review' }

export default function ReviewPage({ params }: { params: { orderId: string; productId: string } }) {
  return <ReviewSubmissionForm orderId={params.orderId} productId={params.productId} />
}
