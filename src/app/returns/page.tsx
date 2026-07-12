import InformationPage from '@/components/layout/InformationPage'

export default function ReturnsPage() {
  return <InformationPage eyebrow="Customer care" title="Returns & Refunds" intro="We want every order to arrive correctly and safely. Contact us promptly if there is a problem with your purchase." sections={[
    { title: 'Return window', paragraphs: ['Contact us within 7 days of delivery. Products must be unopened, unused, undamaged, and in their original sealed packaging unless they arrived defective or incorrect.'] },
    { title: 'Items we cannot accept', bullets: ['Opened cosmetics, skincare, fragrances, or personal-care products for hygiene reasons.', 'Items damaged after delivery or used contrary to instructions.', 'Clearance or final-sale items unless defective.', 'Products without proof of purchase.'] },
    { title: 'Damaged or incorrect items', paragraphs: ['Send your order number, photos, and a description through WhatsApp or email within 48 hours. After verification, we will arrange replacement, store credit, or refund as appropriate.'] },
    { title: 'Refund timing', paragraphs: ['Approved refunds are returned through the original payment method where possible. Provider processing times may apply. Delivery fees are refundable only when the error is ours or the entire order is rejected for a verified defect.'] },
    { title: 'How to request a return', bullets: ['Contact support before sending anything back.', 'Provide the order number and reason.', 'Wait for return instructions and authorization.', 'Package approved returns securely.'] },
  ]} />
}
