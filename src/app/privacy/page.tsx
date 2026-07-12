import InformationPage from '@/components/layout/InformationPage'

export default function PrivacyPage() {
  return <InformationPage eyebrow="Your privacy" title="Privacy Policy" intro="This policy explains how FreedomCosmeticShop collects, uses, protects, and shares personal information when you shop with us." sections={[
    { title: 'Information we collect', bullets: ['Name, Rwanda phone number, optional email, and account credentials.', 'Delivery address and order history.', 'Payment status and provider references; we do not store full card numbers or Mobile Money PINs.', 'Device, browser, security, and service-usage information.'] },
    { title: 'How we use information', bullets: ['Process payments, orders, delivery, returns, and support.', 'Protect accounts and prevent fraud.', 'Send transactional notifications and, with permission, marketing messages.', 'Improve inventory, products, and customer experience.'] },
    { title: 'Sharing', paragraphs: ['We share only necessary information with payment providers, delivery partners, communications providers, hosting services, and authorities when legally required. We do not sell personal information.'] },
    { title: 'Retention and security', paragraphs: ['We retain information only as long as required for service, accounting, fraud prevention, and legal obligations. We use access controls, encrypted transport, secure cookies, and restricted administrative access.'] },
    { title: 'Your choices', bullets: ['Request access or correction of your profile information.', 'Opt out of promotional messages.', 'Request account deletion where retention is not legally required.', 'Contact us with a privacy complaint or question.'] },
    { title: 'Cookies', paragraphs: ['Essential cookies keep accounts, carts, security, and checkout working. Optional analytics should only be enabled with appropriate consent.'] },
  ]} />
}
