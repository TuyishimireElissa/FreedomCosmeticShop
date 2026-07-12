import InformationPage from '@/components/layout/InformationPage'

export default function TermsPage() {
  return <InformationPage eyebrow="Legal" title="Terms & Conditions" intro="These terms govern purchases and use of FreedomCosmeticShop. By ordering, you agree to provide accurate information and comply with these conditions." sections={[
    { title: 'Orders and pricing', bullets: ['All prices are displayed in Rwandan francs (RWF).', 'An order is confirmed after payment approval, or acceptance for eligible cash-on-delivery orders.', 'We may cancel an order affected by a pricing error, unavailable stock, suspected fraud, or an invalid delivery address.'] },
    { title: 'Payments', paragraphs: ['We accept the payment methods shown at checkout. Mobile Money and card confirmations are handled by approved payment providers. Never share your PIN with FreedomCosmeticShop staff.'] },
    { title: 'Delivery', paragraphs: ['Delivery times are estimates and may change because of weather, road conditions, public holidays, or an incomplete address. Risk transfers to the customer after confirmed delivery.'] },
    { title: 'Products', paragraphs: ['Colours and packaging may vary slightly from on-screen images. Always read product ingredients, directions, and warnings. Cosmetics are not medical treatment; seek professional advice for medical concerns.'] },
    { title: 'Acceptable use', bullets: ['Do not attempt unauthorized access, fraud, scraping, or interference with the service.', 'Do not submit false reviews or misuse promotions.', 'Accounts involved in abuse may be suspended.'] },
    { title: 'Liability and governing law', paragraphs: ['Nothing in these terms limits rights that cannot legally be excluded. These terms are governed by the laws of Rwanda, and disputes should first be raised with our support team for good-faith resolution.'] },
  ]} />
}
