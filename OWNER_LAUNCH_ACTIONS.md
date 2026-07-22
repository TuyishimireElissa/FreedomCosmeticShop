# FreedomCosmeticShop Owner Launch Actions

Do not accept a real customer payment until actions 1–10 are completed and recorded. Never paste Mobile Money PINs, full card details, production secrets, or customer passwords into chat, source code, screenshots, or GitHub.

═══════════════════════════════════
## 1. VERIFY THE PRODUCTION DATABASE
═══════════════════════════════════
**URGENCY:** DO NOW
**COST:** RWF 0 on the current Supabase plan; usage above the plan is provider-priced
**TIME:** 20–40 minutes

**WHERE:**
https://supabase.com/dashboard/project/hsdqahltrqjeaskhheis

**WHAT YOU NEED:**
- Access to Supabase project `hsdqahltrqjeaskhheis`
- Its database password
- Access to the Vercel project

**EXACT STEPS:**
1. Sign in and confirm the project is active.
2. Open **Project Settings → Database → Connection string**.
3. Copy the transaction-pooler URL for `DATABASE_URL` and direct/session URL for `DIRECT_URL`.
4. Open https://vercel.com/tuyishimire-elissa/freedom-cosmetic-shop/settings/environment-variables.
5. Set both variables for **Production**, **Preview**, and **Development**. Never commit them.
6. Redeploy, then open https://freedom-cosmetic-shop.vercel.app/api/health.
7. Require HTTP 200 and exactly `{"status":"ok","database":"connected"}`.
8. In Supabase Table Editor verify `User`, `Product`, `Category`, `Order`, `Payment`, `StoreSettings`, and `DeliveryZoneSettings` exist.

**AFTER COMPLETING:** Delete downloaded connection-string notes and rotate the database password if it was exposed anywhere.

**IF YOU SKIP THIS:** Product, login, checkout, payment, and order queries can return 500/503.

═══════════════════════════════════
## 2. CREATE OR VERIFY THE SUPER ADMIN
═══════════════════════════════════
**URGENCY:** DO NOW
**COST:** FREE
**TIME:** 15 minutes

**WHERE:**
https://freedom-cosmetic-shop.vercel.app/login

**WHAT YOU NEED:**
- Phone `+250790215965`
- A unique 16+ character password
- Production database access

**EXACT STEPS:**
1. Generate a password with a password manager; do not reuse another password.
2. Run the repository seed only from a trusted machine with production database variables loaded:
   `ADMIN_SEED_PASSWORD='YOUR_PASSWORD' SEED_RESET_ADMIN_PASSWORD=true npm run db:seed`
3. Immediately remove the password from shell history and temporary files.
4. Sign in at the URL above.
5. Confirm `/admin` opens and a non-admin account cannot open it.
6. Change the password when prompted and enable authenticator-app MFA under `/admin/security/mfa`.

**AFTER COMPLETING:** Store the password in a password manager. Delete `/tmp/fcs-admin-login.txt` after copying it securely.

**IF YOU SKIP THIS:** You may be locked out of product, order, delivery, and payment administration.

═══════════════════════════════════
## 3. CONFIGURE TRANSACTIONAL SMS
═══════════════════════════════════
**URGENCY:** DO NOW
**COST:** RWF 0 account setup; SMS credits and sender-ID approval are provider-priced
**TIME:** 1–3 business days including sender approval

**WHERE:**
https://account.africastalking.com/
Fallback: https://pindo.io/

**WHAT YOU NEED:**
- Registered business identity
- Approved sender ID of 11 characters or fewer
- A Rwanda phone that can receive a test SMS

**EXACT STEPS:**
1. Create and verify an Africa’s Talking production account—not only sandbox.
2. Create a production application and fund its SMS balance.
3. Request sender ID approval. Do not assume `FREEDOM` is approved.
4. Copy `AT_USERNAME`, `AT_API_KEY`, and the approved `AT_SENDER_ID`.
5. Optionally create a Pindo account and copy `PINDO_API_KEY` for fallback.
6. Add those variables in Vercel Production settings.
7. Set `ENABLE_SMS_NOTIFICATIONS=true`.
8. Redeploy.
9. Send one transactional test to your own `+250` number and verify handset receipt, not only API acceptance.
10. Confirm both Kinyarwanda and English messages identify the order number and amount correctly.

**AFTER COMPLETING:** Keep keys only in Vercel. Rotate any key shown in screenshots or chat.

**IF YOU SKIP THIS:** Paid customers will not receive confirmation SMS even if payment succeeds.

═══════════════════════════════════
## 4. ACTIVATE PAYPACK MTN MOMO
═══════════════════════════════════
**URGENCY:** DO NOW
**COST:** RWF 0 account/application creation; transaction fees are PayPack-contract priced
**TIME:** 1–5 business days for business verification

**WHERE:**
https://payments.paypack.rw/
Documentation: https://docs.paypack.rw/overview/getting-started/

**WHAT YOU NEED:**
- RDB certificate and TIN
- Business bank/MoMo settlement details
- Production domain and webhook URL

**EXACT STEPS:**
1. Register or sign in and complete PayPack account verification.
2. Create an application with cash-in/read-write privileges; do not grant cash-out unless refunds require it.
3. Copy the one-time `client_id` and `client_secret` securely.
4. Configure webhook URL: `https://freedom-cosmetic-shop.vercel.app/api/webhooks/paypack`.
5. Obtain/configure the webhook signing secret expected in `x-paypack-signature`.
6. Add `PAYPACK_CLIENT_ID`, `PAYPACK_CLIENT_SECRET`, and `PAYPACK_WEBHOOK_SECRET` to Vercel Production.
7. Set `PAYPACK_ENVIRONMENT=production` and `ENABLE_REAL_PAYMENTS=true`.
8. Redeploy.
9. Do the real-payment test in Action 10 before accepting customer orders.

**AFTER COMPLETING:** Store secrets only in Vercel and your password manager.

**IF YOU SKIP THIS:** Production payment initiation deliberately fails closed with `PAYMENTS_NOT_CONFIGURED` instead of pretending a payment succeeded.

═══════════════════════════════════
## 5. REGISTER THE BUSINESS WITH RDB
═══════════════════════════════════
**URGENCY:** THIS WEEK / BEFORE TAKING PAYMENTS
**COST:** FREE for online business registration; professional assistance is optional
**TIME:** Often same day when documents are complete

**WHERE:**
https://businessprocedures.rdb.rw/
Official guidance: https://www.rra.gov.rw/en/details?tx_news_pi1%5Baction%5D=detail&tx_news_pi1%5Bcontroller%5D=News&tx_news_pi1%5Bnews%5D=2172

**WHAT YOU NEED:** National ID/passport, business name, address, ownership/director details.

**EXACT STEPS:**
1. Create/sign into the RDB business-registration portal.
2. Search/reserve the business name.
3. Choose the correct legal form; obtain professional advice if unsure.
4. Submit owners, activities, address, and required identity documents.
5. Download the registration certificate and verify every spelling and number.
6. Put the exact legal name and RDB number into store legal pages/settings—never a placeholder.

**AFTER COMPLETING:** Keep the certificate in encrypted business storage.

**IF YOU SKIP THIS:** Provider onboarding, contracts, tax compliance, and customer remedies can be blocked.

═══════════════════════════════════
## 6. OBTAIN AND VERIFY THE RRA TIN
═══════════════════════════════════
**URGENCY:** THIS WEEK / BEFORE TAKING PAYMENTS
**COST:** FREE
**TIME:** Same day when issued through integrated RDB registration

**WHERE:**
https://www.rra.gov.rw/
Procedure: https://businessprocedures.rdb.rw/procedure/print/47/step/0?showRecourses=true&showCertification=false&l=en&embed=true&includeSearch=false

**WHAT YOU NEED:** RDB certificate, national ID/passport, contact/address details.

**EXACT STEPS:**
1. Check the RDB certificate for the integrated TIN.
2. If absent, contact RRA through the official portal or toll-free 3004.
3. Confirm tax types, filing dates, VAT status, invoicing obligations, and e-invoicing requirements with RRA/accountant.
4. Put only the verified TIN on invoices and legal records.

**AFTER COMPLETING:** Give the TIN to PayPack and other providers only through official onboarding.

**IF YOU SKIP THIS:** You may issue invalid invoices or miss tax registration/filing duties.

═══════════════════════════════════
## 7. ADD REAL PRODUCT RECORDS
═══════════════════════════════════
**URGENCY:** THIS WEEK
**COST:** FREE
**TIME:** 10–20 minutes per SKU

**WHERE:**
https://freedom-cosmetic-shop.vercel.app/admin/products

**WHAT YOU NEED:** Supplier invoices, genuine SKU/barcode, RWF price, physical stock count, ingredients, warnings, size, batch/expiry data.

**EXACT STEPS:**
1. Log in as admin.
2. Create/update one product at a time from supplier evidence.
3. Enter integer RWF prices and real stock only.
4. Enter batch and expiry information where applicable.
5. Do not invent ratings, review counts, discounts, scarcity, or authenticity claims.
6. Open the public detail page and verify every field.

**AFTER COMPLETING:** Reconcile stock with physical inventory daily.

**IF YOU SKIP THIS:** Customers can buy incorrectly described, unavailable, expired, or wrongly priced products.

═══════════════════════════════════
## 8. UPLOAD PRODUCT-SPECIFIC PHOTOS
═══════════════════════════════════
**URGENCY:** THIS WEEK
**COST:** FREE within the current Cloudinary allowance; overages are provider-priced
**TIME:** 15–30 minutes per SKU

**WHERE:**
Admin product editor and https://console.cloudinary.com/

**WHAT YOU NEED:** Front, back label, seal, size-scale, texture/shade images; rights to use every image.

**EXACT STEPS:**
1. Photograph the exact product/SKU under neutral light.
2. Upload only through the admin product image workflow.
3. Add accurate English and Kinyarwanda alt text.
4. Set the true front photo as primary and order the remaining images.
5. Verify square mobile cards and the full detail gallery.
6. Replace every generic Unsplash legacy image before launch.

**AFTER COMPLETING:** Keep originals and supplier usage permission.

**IF YOU SKIP THIS:** Customers may receive a product different from the image, causing returns and loss of trust.

═══════════════════════════════════
## 9. BUY AND CONNECT A .RW DOMAIN
═══════════════════════════════════
**URGENCY:** BEFORE LAUNCH
**COST:** Registrar-priced in RWF; check the live quote before payment
**TIME:** 30–90 minutes plus DNS propagation

**WHERE:**
Official registry: https://registry.ricta.org.rw/
Vercel: https://vercel.com/tuyishimire-elissa/freedom-cosmetic-shop/settings/domains

**WHAT YOU NEED:** Chosen domain, registrar account, Vercel project access.

**EXACT STEPS:**
1. Search the official registry/approved registrar for availability.
2. Register the domain in the business owner’s name.
3. Add it in Vercel Domains.
4. Copy the exact DNS records Vercel provides into the registrar.
5. Wait for Vercel to show **Valid Configuration** and HTTPS active.
6. Update `APP_URL`, `NEXT_PUBLIC_APP_URL`, PayPack webhook URL, email links, Google properties, and canonical metadata.

**AFTER COMPLETING:** Enable auto-renew and business-controlled recovery email/MFA.

**IF YOU SKIP THIS:** Branding, provider callbacks, search ownership, and customer confidence remain weaker.

═══════════════════════════════════
## 10. RUN ONE REAL MTN PAYMENT AND SMS TEST
═══════════════════════════════════
**URGENCY:** BEFORE LAUNCH
**COST:** Product/test amount + PayPack fee + one SMS; use the lowest genuine order amount of at least RWF 100
**TIME:** 30–60 minutes

**WHERE:**
https://freedom-cosmetic-shop.vercel.app/

**WHAT YOU NEED:** Your own MTN MoMo phone, sufficient balance, second device/browser, admin access, provider dashboards.

**EXACT STEPS:**
1. Create a clearly documented real internal test SKU with stock 1 and honest price; do not expose it publicly longer than the test.
2. Browse as a customer, add it to cart, and check out to a real Gasabo address you control.
3. Select MTN MoMo and use your own `078`/`079` number.
4. Confirm the exact amount shown in checkout and in the MTN prompt.
5. Enter the PIN only on the MTN-controlled phone prompt—never on this website.
6. Approve once. Do not retry while pending.
7. Verify PayPack transaction success, one `Payment` row marked `PAID`, one order marked `CONFIRMED`, and stock reduced exactly once.
8. Verify one confirmation SMS arrives with the correct order number and amount.
9. Replay the same signed webhook only in a controlled provider/test tool and verify stock/coupon usage does not decrement twice.
10. Refund/reconcile the test according to your accounting policy and archive evidence without customer secrets.

**AFTER COMPLETING:** Record date, order number, expected/actual amount, provider transaction ID, SMS ID, and result in a private launch checklist.

**IF YOU SKIP THIS:** Code-level tests cannot prove your live merchant account, webhook signing, MTN prompt, settlement, and handset delivery work together.

═══════════════════════════════════
## 11. CREATE A GOOGLE BUSINESS PROFILE
═══════════════════════════════════
**URGENCY:** BEFORE LAUNCH
**COST:** FREE
**TIME:** 30 minutes plus Google verification

**WHERE:** https://www.google.com/business/

**WHAT YOU NEED:** Business Google account, exact legal/trading name, real service area/address, verified phone, hours.

**EXACT STEPS:**
1. Sign in with a business-controlled Google account protected by MFA.
2. Add/claim the business and choose the accurate category.
3. Add only real address/service-area, phone, hours, photos, and website.
4. Complete Google’s verification method.
5. Do not buy reviews or create fake locations.

**AFTER COMPLETING:** Add a second trusted owner and document account recovery.

**IF YOU SKIP THIS:** Customers have less reliable local discovery and contact verification.

═══════════════════════════════════
## 12. CONFIGURE GOOGLE SEARCH CONSOLE
═══════════════════════════════════
**URGENCY:** BEFORE LAUNCH
**COST:** FREE
**TIME:** 20–40 minutes

**WHERE:** https://search.google.com/search-console

**WHAT YOU NEED:** Google account and DNS access.

**EXACT STEPS:**
1. Add a **Domain property** for the final domain.
2. Add the DNS TXT verification record at the registrar.
3. Verify ownership.
4. Submit `https://YOUR-DOMAIN/sitemap.xml`.
5. Inspect `/`, `/products`, and one real product URL.
6. Monitor indexing, security, and structured-data errors weekly.

**AFTER COMPLETING:** Keep DNS and Search Console access under the business account.

**IF YOU SKIP THIS:** Indexing errors and security notices may go unnoticed.

═══════════════════════════════════
## 13. OBTAIN RWANDA LEGAL REVIEW
═══════════════════════════════════
**URGENCY:** BEFORE LAUNCH
**COST:** Lawyer-priced; request a written RWF quote before engagement
**TIME:** 3–10 business days

**WHERE:** Rwanda-qualified commercial/e-commerce/privacy counsel.

**WHAT YOU NEED:** Terms, privacy policy, returns/shipping policy, checkout screenshots, provider agreements, data-flow inventory.

**EXACT STEPS:**
1. Ask counsel to review consumer protection, e-commerce, returns, product claims, privacy, SMS consent, payment terms, and cross-border/cloud processing.
2. Replace every owner placeholder in `src/lib/business-config.ts` with verified legal facts through a reviewed code change.
3. Confirm complaint/refund contacts and response procedures.
4. Publish only counsel-approved text.

**AFTER COMPLETING:** Store the written advice and reviewed policy versions.

**IF YOU SKIP THIS:** Policies may be inaccurate or unenforceable and regulatory exposure may remain.

═══════════════════════════════════
## 14. ADD FLUTTERWAVE CARD PAYMENTS
═══════════════════════════════════
**URGENCY:** LATER—only after MoMo is stable
**COST:** Account setup may be RWF 0; transaction fees are contract-priced
**TIME:** 2–7 business days

**WHERE:** https://dashboard.flutterwave.com/

**WHAT YOU NEED:** Verified business, settlement account, production API keys, webhook hash.

**EXACT STEPS:**
1. Complete merchant verification.
2. Configure the production callback/webhook URL.
3. Add `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, `FLW_ENCRYPTION_KEY`, and `FLW_WEBHOOK_HASH` in Vercel.
4. Test one real low-value payment and refund.
5. Confirm the application stores only last four digits/brand, never full card details.

**AFTER COMPLETING:** Rotate sandbox keys out of Production.

**IF YOU SKIP THIS:** Card checkout must remain disabled/fail closed; do not advertise cards as available.

═══════════════════════════════════
## 15. CONFIRM RWANDA FDA COSMETICS OBLIGATIONS
═══════════════════════════════════
**URGENCY:** BEFORE SELLING A REGULATED PRODUCT; otherwise LATER only on written regulator advice
**COST:** Rwanda FDA application/testing fees vary by product and classification; obtain an official RWF invoice/fee schedule
**TIME:** Authority-dependent

**WHERE:**
https://rwandafda.gov.rw/medicated-cosmetics-guidelines/
Current guideline: https://rwandafda.gov.rw/monitoring-tool/documents-management/uploads/1/Guidelines/1767620839_GuiGuidelines-on-Submission-of-Documentation-for-Registration-of-Cosmetic-Products.pdf

**WHAT YOU NEED:** Product classification, manufacturer authorization, ingredient list, labels, certificates, samples, importer records.

**EXACT STEPS:**
1. Inventory every product and classify medicated vs non-medicated with Rwanda FDA guidance.
2. Contact Rwanda FDA in writing for importer/retailer and product-registration obligations.
3. Submit required dossiers/samples before sale where registration is required.
4. Remove prohibited, unregistered, counterfeit, expired, or unsupported therapeutic-claim products.
5. Keep approval numbers and expiry/renewal dates linked to each SKU.

**AFTER COMPLETING:** Store approvals and renewal reminders securely.

**IF YOU SKIP THIS:** Regulated products may be detained, recalled, or prohibited and the business may face enforcement.

═══════════════════════════════════
## 16. REGISTER WITH THE DATA PROTECTION AND PRIVACY OFFICE
═══════════════════════════════════
**URGENCY:** BEFORE LAUNCH
**COST:** Confirm with DPO; public guidance has described registration as free
**TIME:** Application preparation plus authority review

**WHERE:**
Controller: https://dpo.gov.rw/services/data-controller-certificate
Processor: https://dpo.gov.rw/services/data-processor-certificate

**WHAT YOU NEED:** RDB/TIN documents, processing inventory, privacy policy, security controls, processors and overseas hosting details, responsible contact/DPO.

**EXACT STEPS:**
1. Determine with counsel whether the business is a controller, processor, or both.
2. Download the current official form and checklist.
3. Document Supabase, Vercel, Cloudinary, SMS, PayPack, Flutterwave, email, and analytics data flows.
4. Address overseas storage/transfer authorization requirements.
5. Submit and retain the certificate/reference.
6. Implement access/deletion request and 48-hour breach escalation procedures advised by counsel/DPO.

**AFTER COMPLETING:** Record certificate expiry/renewal and processor contracts.

**IF YOU SKIP THIS:** Personal-data processing may violate Rwanda’s privacy law and expose the business to enforcement.

═══════════════════════════════════
## 17. BUY BUSINESS INSURANCE
═══════════════════════════════════
**URGENCY:** LATER, but before scaling inventory/deliveries
**COST:** Insurer-priced; request at least three written RWF quotes
**TIME:** 2–7 business days

**WHERE:** Licensed Rwanda insurers/brokers.

**WHAT YOU NEED:** RDB/TIN, inventory value, premises/delivery model, product sources, annual-sales estimate, incident history.

**EXACT STEPS:**
1. Request product liability, public liability, stock/property, cyber/data, and delivery/transit options.
2. Disclose cosmetics/import activities accurately.
3. Compare exclusions, deductibles, limits, claims process, and territorial scope—not only premium.
4. Have counsel/accountant review the selected policy.
5. Store policy and claims contacts in the incident plan.

**AFTER COMPLETING:** Schedule renewal and update declared stock/revenue.

**IF YOU SKIP THIS:** A product, cyber, stock, or delivery incident may be paid entirely from business funds.

## Final owner go/no-go rule

Launch only when the production health response is correct, one real MTN payment settles once, stock decrements once, one correct SMS reaches the handset, the admin can manage the order, legal/provider registrations are complete, and the result is recorded. Automated tests cannot replace these owner-authorized real-provider checks.
