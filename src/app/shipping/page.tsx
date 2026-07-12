import InformationPage from '@/components/layout/InformationPage'

export default function ShippingPage() {
  return <InformationPage eyebrow="Nationwide delivery" title="Shipping Policy" intro="FreedomCosmeticShop delivers to all 30 districts of Rwanda. Fees are calculated from the delivery district during checkout." sections={[
    { title: 'Delivery fees', bullets: ['Gasabo, Kicukiro, and Nyarugenge: 1,000 RWF.', 'Northern and Southern provinces: 3,000 RWF.', 'Eastern Province: 3,500 RWF.', 'Western Province: 4,000 RWF.', 'Qualifying orders above the displayed free-delivery threshold receive free standard delivery.'] },
    { title: 'Estimated times', bullets: ['Kigali: same day where available, otherwise 1–2 business days.', 'Northern, Southern, and Eastern provinces: approximately 2–3 business days.', 'Western Province: approximately 3–4 business days.'] },
    { title: 'Address requirements', paragraphs: ['Provide a reachable Rwanda phone number, province, district, sector, and clear landmark. Delays caused by incorrect or incomplete details may require a second delivery fee.'] },
    { title: 'Delivery confirmation', paragraphs: ['Inspect the parcel before accepting where practical. Report visible damage or incorrect items within 48 hours. Never give a Mobile Money PIN to a delivery rider.'] },
    { title: 'Delays', paragraphs: ['Weather, road access, high order volumes, public holidays, and events outside our control may affect estimates. Support will communicate material delays.'] },
  ]} />
}
