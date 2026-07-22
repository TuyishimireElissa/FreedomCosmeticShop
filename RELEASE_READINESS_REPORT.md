# FreedomCosmeticShop Scorched-Earth Release Audit

> Generated from the final repaired source. Static ratings combine TypeScript compilation, Next.js production build, import/export resolution, Prisma Client typing, and route/page source inspection. They do not claim that external payment, SMS, email, or mobile-network providers were charged or exercised.

## Damage report (initial audit)

```text
TypeScript errors:  0
Build errors:       0
Broken imports:     0
Schema mismatches:  0
Crashing pages:     0
Broken API routes:  0
Broken components:  0
Orphaned files:     54 (48 initial + 6 exposed after deleting orphan chains)
Empty files:        0
───────────────────────
TOTAL PHASE-1 PROBLEMS: 54
```

Initial build also emitted 6 database-authentication diagnostics because ignored local `.env` files contain stale credentials. The build still completed through 58/58 static pages. Production database health was independently HTTP-tested and returned 200.

## Final source inventory

- TypeScript/TSX files: 536
- Static imports/exports/dynamic imports traced: 2273
- Broken imports: 0
- Prisma models: 59
- Prisma client references: 245
- Prisma model mismatches: 0
- Pages: 39
- API routes: 169
- Components: 121
- Orphan components: 0
- Empty TS/TSX files: 0

## Page ratings

- **RENDERS** — `src/app/(auth)/forgot-password/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/(auth)/login/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/(auth)/register/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/account/orders/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/account/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/account/settings/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/account/wishlist/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/analytics/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/bundles/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/customers/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/orders/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/products/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/reviews/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/security/mfa/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/settings/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/admin/whatsapp-guide/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/blog/[slug]/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/blog/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/bundles/[slug]/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/bundles/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/cart/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/change-password/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/checkout/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/checkout/payment-return/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/contact/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/faq/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/privacy/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/products/[slug]/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/products/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/quiz/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/returns/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/review/[orderId]/[productId]/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/shipping/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/support/whatsapp/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/terms/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/track-order/page.tsx` — default React page export present; imports/typecheck/build valid
- **RENDERS** — `src/app/wholesale/page.tsx` — default React page export present; imports/typecheck/build valid

## API route ratings

- **WORKS** — `src/app/api/account/orders/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/activity-log/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/analytics/overview/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/analytics/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/analytics/whatsapp/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/backup/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/banners/[id]/route.ts` — handlers: PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/banners/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/blog/[id]/route.ts` — handlers: PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/blog/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/brands/[id]/route.ts` — handlers: PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/brands/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/bundles/[id]/route.ts` — handlers: PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/bundles/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/categories/[id]/route.ts` — handlers: PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/categories/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/coupons/[id]/route.ts` — handlers: PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/coupons/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/customers/[id]/route.ts` — handlers: GET, PATCH — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/customers/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/dashboard/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/deliveries/[id]/route.ts` — handlers: PATCH — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/deliveries/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/delivery-zones/route.ts` — handlers: GET, PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/export/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/live-stats/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/logo/route.ts` — handlers: GET, POST, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/loyalty/birthday/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/notifications/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/orders/route.ts` — handlers: GET, PATCH — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/products/[id]/batches/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/products/[id]/images/[imageId]/route.ts` — handlers: PATCH, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/products/[id]/images/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/products/[id]/pricing/route.ts` — handlers: GET, PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/products/[id]/route.ts` — handlers: GET, PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/products/bulk-pricing/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/products/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/referrals/[id]/route.ts` — handlers: PATCH — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/retention/dispatch/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/reviews/[id]/hide/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/reviews/[id]/resolve-reports/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/reviews/[id]/respond/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/reviews/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/search/zero-results/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/alerts/[id]/route.ts` — handlers: PATCH — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/dashboard/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/logs/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/mfa/disable/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/mfa/setup/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/mfa/verify/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/test-accounts/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/security/weekly-report/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/staff/[id]/route.ts` — handlers: PATCH, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/staff/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/stats/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/suppliers/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/analytics/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/applications/[id]/approve/route.ts` — handlers: PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/applications/[id]/reject/route.ts` — handlers: PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/applications/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/credit-payment/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/customers/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/orders/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/retention/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/admin/wholesale/send-reminder/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/analytics/404/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/analytics/track/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/analytics/whatsapp-click/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/forgot/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/login/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/logout/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/me/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/mfa/verify/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/refresh/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/register/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/reset/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/verify/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/auth/verify-login/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/banners/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/blog/[slug]/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/blog/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/brands/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/bundles/[slug]/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/bundles/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/cart/add/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/cart/route.ts` — handlers: GET, POST, PATCH, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/cart/sync/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/cart/update/route.ts` — handlers: PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/categories/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/coupons/active-homepage/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/coupons/preview/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/coupons/validate/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/cron/retention-reminders/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/cron/review-requests/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/delivery/calculate/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/delivery/districts/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/delivery/fee/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/delivery/sectors/[district]/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/delivery/zones/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/events/stream/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/health/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/loyalty/birthday/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/loyalty/history/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/loyalty/points/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/mobile/admin/dashboard/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/mobile/admin/quick-action/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/notifications/read/[id]/route.ts` — handlers: PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/notifications/route.ts` — handlers: GET, PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/orders/[id]/route.ts` — handlers: GET, PATCH — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/orders/[id]/track/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/orders/create/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/orders/route.ts` — handlers: POST, GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/payments/card/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/payments/momo/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/payments/mtn-momo/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/payments/refund/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/payments/status/[txId]/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/products/[slug]/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/products/best-sellers/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/products/cross-sells/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/products/featured/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/products/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/quiz/recommend/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/recommendations/personalized/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/referrals/code/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/referrals/redeem/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/retention/reorder-reminders/[id]/route.ts` — handlers: DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/retention/reorder-reminders/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/retention/stock-alerts/[id]/route.ts` — handlers: DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/retention/stock-alerts/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/[reviewId]/report/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/[reviewId]/vote/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/eligibility/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/homepage/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/product/[productId]/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/submit/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/reviews/upload/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/search/popular/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/search/suggestions/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/search/track-zero-result/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/seed/route.ts` — handlers: POST, GET, PUT, PATCH, DELETE, OPTIONS — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/settings/logo/route.ts` — handlers: POST, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/settings/store/route.ts` — handlers: GET, PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/sms/abandoned-cart/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/sms/opt-out/route.ts` — handlers: POST, DELETE, GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/sms/scheduled/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/sms/send/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/sms/stats/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/sms/templates/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/upload/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/user/addresses/[id]/route.ts` — handlers: PUT, DELETE — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/user/addresses/route.ts` — handlers: GET, POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/user/change-password/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/user/communication-preferences/route.ts` — handlers: GET, PATCH — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/user/profile/route.ts` — handlers: GET, PUT — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/webhooks/flutterwave/route.ts` — handlers: POST, GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/webhooks/paypack/route.ts` — handlers: POST, GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/application/status/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/apply/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/dashboard/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/info/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/invoices/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/my-credit/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/my-invoices/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/my-pricing/route.ts` — handlers: GET — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wholesale/reorder/route.ts` — handlers: POST — HTTP handler exports present; imports/typecheck/build valid
- **WORKS** — `src/app/api/wishlist/route.ts` — handlers: GET, POST, DELETE — HTTP handler exports present; imports/typecheck/build valid

## Component ratings

- **USED + WORKS** — `src/components/Providers.tsx`
- **USED + WORKS** — `src/components/a11y/FormField.tsx`
- **USED + WORKS** — `src/components/a11y/FormSelect.tsx`
- **USED + WORKS** — `src/components/a11y/FormTextarea.tsx`
- **USED + WORKS** — `src/components/a11y/IconButton.tsx`
- **USED + WORKS** — `src/components/a11y/LiveAnnouncer.tsx`
- **USED + WORKS** — `src/components/a11y/OrderStatusBadge.tsx`
- **USED + WORKS** — `src/components/a11y/PaymentStatusBadge.tsx`
- **USED + WORKS** — `src/components/a11y/SkipToContent.tsx`
- **USED + WORKS** — `src/components/a11y/StockStatus.tsx`
- **USED + WORKS** — `src/components/admin/AdminAnalytics.tsx`
- **USED + WORKS** — `src/components/admin/AdminAuthGuard.tsx`
- **USED + WORKS** — `src/components/admin/AdminCustomers.tsx`
- **USED + WORKS** — `src/components/admin/AdminDeliveries.tsx`
- **USED + WORKS** — `src/components/admin/AdminFeaturePage.tsx`
- **USED + WORKS** — `src/components/admin/AdminHeader.tsx`
- **USED + WORKS** — `src/components/admin/AdminLoginScreen.tsx`
- **USED + WORKS** — `src/components/admin/AdminMarketing.tsx`
- **USED + WORKS** — `src/components/admin/AdminMobilePanel.tsx`
- **USED + WORKS** — `src/components/admin/AdminOverview.tsx`
- **USED + WORKS** — `src/components/admin/AdminPayments.tsx`
- **USED + WORKS** — `src/components/admin/AdminProductImageManager.tsx`
- **USED + WORKS** — `src/components/admin/AdminProductManager.tsx`
- **USED + WORKS** — `src/components/admin/AdminReports.tsx`
- **USED + WORKS** — `src/components/admin/AdminReviewsView.tsx`
- **USED + WORKS** — `src/components/admin/AdminSecurityDashboard.tsx`
- **USED + WORKS** — `src/components/admin/AdminSettings.tsx`
- **USED + WORKS** — `src/components/admin/AdminShellContext.tsx`
- **USED + WORKS** — `src/components/admin/AdminSidebar.tsx`
- **USED + WORKS** — `src/components/admin/AdminSmsManager.tsx`
- **USED + WORKS** — `src/components/admin/AdminStaff.tsx`
- **USED + WORKS** — `src/components/admin/AdminView.tsx`
- **USED + WORKS** — `src/components/admin/AdminWholesale.tsx`
- **USED + WORKS** — `src/components/admin/BundleManager.tsx`
- **USED + WORKS** — `src/components/admin/InvoicePrinter.tsx`
- **USED + WORKS** — `src/components/admin/LogoUploader.tsx`
- **USED + WORKS** — `src/components/admin/RealTimeNotifications.tsx`
- **USED + WORKS** — `src/components/admin/WhatsAppAgentGuide.tsx`
- **USED + WORKS** — `src/components/admin/WhatsAppAnalytics.tsx`
- **USED + WORKS** — `src/components/admin/WholesalePricingPanel.tsx`
- **USED + WORKS** — `src/components/admin/ZeroResultSearches.tsx`
- **USED + WORKS** — `src/components/analytics/AnalyticsConsent.tsx`
- **USED + WORKS** — `src/components/auth/MFALoginChallenge.tsx`
- **USED + WORKS** — `src/components/auth/OTPInput.tsx`
- **USED + WORKS** — `src/components/blog/BlogListingClient.tsx`
- **USED + WORKS** — `src/components/blog/BlogPostContent.tsx`
- **USED + WORKS** — `src/components/bundles/BundleCard.tsx`
- **USED + WORKS** — `src/components/bundles/BundleDetailView.tsx`
- **USED + WORKS** — `src/components/bundles/BundlesView.tsx`
- **USED + WORKS** — `src/components/cart/CartWhatsAppOrder.tsx`
- **USED + WORKS** — `src/components/checkout/AddressForm.tsx`
- **USED + WORKS** — `src/components/checkout/ConfirmationView.tsx`
- **USED + WORKS** — `src/components/checkout/MoMoPayment.tsx`
- **USED + WORKS** — `src/components/checkout/MoMoWaiting.tsx`
- **USED + WORKS** — `src/components/checkout/OrderSummary.tsx`
- **USED + WORKS** — `src/components/checkout/PaymentSelector.tsx`
- **USED + WORKS** — `src/components/contact/ContactPageClient.tsx`
- **USED + WORKS** — `src/components/dev/PerformanceMonitor.tsx`
- **USED + WORKS** — `src/components/home/DeliveryPromo.tsx`
- **USED + WORKS** — `src/components/home/FeaturedProducts.tsx`
- **USED + WORKS** — `src/components/home/Hero.tsx`
- **USED + WORKS** — `src/components/home/HeroBanner.tsx`
- **USED + WORKS** — `src/components/home/HomeSearch.tsx`
- **USED + WORKS** — `src/components/home/MainCategories.tsx`
- **USED + WORKS** — `src/components/home/PersonalizedRecommendations.tsx`
- **USED + WORKS** — `src/components/home/QuizBanner.tsx`
- **USED + WORKS** — `src/components/home/ReviewsSection.tsx`
- **USED + WORKS** — `src/components/home/TrustSection.tsx`
- **USED + WORKS** — `src/components/home/WhatsAppCTA.tsx`
- **USED + WORKS** — `src/components/layout/AnnouncementBar.tsx`
- **USED + WORKS** — `src/components/layout/BottomNav.tsx`
- **USED + WORKS** — `src/components/layout/Footer.tsx`
- **USED + WORKS** — `src/components/layout/InformationPage.tsx`
- **USED + WORKS** — `src/components/layout/Navbar.tsx`
- **USED + WORKS** — `src/components/layout/SiteChrome.tsx`
- **USED + WORKS** — `src/components/products/DeliveryEstimator.tsx`
- **USED + WORKS** — `src/components/products/FilterChips.tsx`
- **USED + WORKS** — `src/components/products/FilterSidebar.tsx`
- **USED + WORKS** — `src/components/products/MobileFilters.tsx`
- **USED + WORKS** — `src/components/products/OrderViaWhatsApp.tsx`
- **USED + WORKS** — `src/components/products/ProductDetailClient.tsx`
- **USED + WORKS** — `src/components/products/ProductGrid.tsx`
- **USED + WORKS** — `src/components/products/ProductImageGallery.tsx`
- **USED + WORKS** — `src/components/products/ProductTabs.tsx`
- **USED + WORKS** — `src/components/products/ProductsPageClient.tsx`
- **USED + WORKS** — `src/components/quiz/RoutineQuiz.tsx`
- **USED + WORKS** — `src/components/reviews/ProductReviews.tsx`
- **USED + WORKS** — `src/components/reviews/ReviewSubmissionForm.tsx`
- **USED + WORKS** — `src/components/seo/StructuredData.tsx`
- **USED + WORKS** — `src/components/settings/CommunicationPreferences.tsx`
- **USED + WORKS** — `src/components/settings/LowDataToggle.tsx`
- **USED + WORKS** — `src/components/storefront/CartDrawer.tsx`
- **USED + WORKS** — `src/components/storefront/CartView.tsx`
- **USED + WORKS** — `src/components/storefront/ProductCard.tsx`
- **USED + WORKS** — `src/components/storefront/SearchWithSuggestions.tsx`
- **USED + WORKS** — `src/components/storefront/TrackOrderView.tsx`
- **USED + WORKS** — `src/components/support/WhatsAppSupportView.tsx`
- **USED + WORKS** — `src/components/ui/Breadcrumbs.tsx`
- **USED + WORKS** — `src/components/ui/LanguageSelector.tsx`
- **USED + WORKS** — `src/components/ui/LazySection.tsx`
- **USED + WORKS** — `src/components/ui/OfflineBanner.tsx`
- **USED + WORKS** — `src/components/ui/SmartImage.tsx`
- **USED + WORKS** — `src/components/ui/WhatsAppButton.tsx`
- **USED + WORKS** — `src/components/ui/alert-dialog.tsx`
- **USED + WORKS** — `src/components/ui/badge.tsx`
- **USED + WORKS** — `src/components/ui/button.tsx`
- **USED + WORKS** — `src/components/ui/checkbox.tsx`
- **USED + WORKS** — `src/components/ui/dialog.tsx`
- **USED + WORKS** — `src/components/ui/dropdown-menu.tsx`
- **USED + WORKS** — `src/components/ui/input.tsx`
- **USED + WORKS** — `src/components/ui/label.tsx`
- **USED + WORKS** — `src/components/ui/select.tsx`
- **USED + WORKS** — `src/components/ui/sheet.tsx`
- **USED + WORKS** — `src/components/ui/skeleton.tsx`
- **USED + WORKS** — `src/components/ui/switch.tsx`
- **USED + WORKS** — `src/components/ui/tabs.tsx`
- **USED + WORKS** — `src/components/ui/textarea.tsx`
- **USED + WORKS** — `src/components/ui/toast.tsx`
- **USED + WORKS** — `src/components/wholesale/WholesaleDashboard.tsx`
- **USED + WORKS** — `src/components/wholesale/WholesaleInvoices.tsx`
- **USED + WORKS** — `src/components/wholesale/WholesaleView.tsx`

## Prisma models and fields

### `User`

- `id: String`
- `name: String`
- `email: String?`
- `phone: String`
- `passwordHash: String?`
- `role: String`
- `avatar: String?`
- `loyaltyPoints: Int`
- `emailVerifiedAt: DateTime?`
- `mfaEnabled: Boolean`
- `mfaSecret: String?`
- `mfaBackupCodes: String[]`
- `failedLoginCount: Int`
- `lockedUntil: DateTime?`
- `lastLoginAt: DateTime?`
- `lastLoginIp: String?`
- `lastLoginDevice: String?`
- `passwordChangedAt: DateTime?`
- `mustChangePassword: Boolean`
- `isTestAccount: Boolean`
- `userType: String`
- `wholesaleStatus: String?`
- `businessName: String?`
- `businessType: String?`
- `businessPhone: String?`
- `businessAddress: String?`
- `businessDistrict: String?`
- `tinNumber: String?`
- `wholesaleApprovedAt: DateTime?`
- `wholesaleApprovedBy: String?`
- `wholesaleLimit: Int?`
- `wholesaleBalance: Int`
- `wholesaleDiscount: Int`
- `isDeleted: Boolean`
- `deletedAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `orders: Order[]`
- `cart: Cart?`
- `reviews: Review[]`
- `wishlistItems: Wishlist[]`
- `addresses: Address[]`
- `notifications: Notification[]`
- `loyaltyTransactions: LoyaltyPoints[]`
- `blogPosts: BlogPost[]`
- `staffProfile: StaffProfile?`
- `activityLogs: ActivityLog[]`
- `wholesaleApplication: WholesaleApplication?`
- `wholesaleCredit: WholesaleCredit?`
- `wholesaleInvoices: WholesaleInvoice[]`
- `quizResults: QuizResult[]`
- `referralCode: ReferralCode?`
- `referralRedemptions: ReferralRedemption[]`
- `birthdayRewards: BirthdayReward[]`
- `reorderReminders: ReorderReminder[]`
- `stockAlerts: StockAlert[]`
- `communicationPreference: CommunicationPreference?`
- `customerSegment: CustomerSegment?`
- `abandonedCartReminders: AbandonedCartReminder[]`

### `StaffProfile`

- `id: String`
- `userId: String`
- `user: User`
- `employeeId: String`
- `department: String`
- `position: String`
- `hireDate: DateTime`
- `isActive: Boolean`
- `permissions: String`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `Category`

- `id: String`
- `name: String`
- `slug: String`
- `description: String?`
- `image: String?`
- `icon: String?`
- `parentId: String?`
- `parent: Category?`
- `children: Category[]`
- `sortOrder: Int`
- `isActive: Boolean`
- `isDeleted: Boolean`
- `deletedAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `products: Product[]`

### `Brand`

- `id: String`
- `name: String`
- `slug: String`
- `description: String?`
- `logo: String?`
- `website: String?`
- `country: String?`
- `isActive: Boolean`
- `isDeleted: Boolean`
- `deletedAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `products: Product[]`

### `Product`

- `id: String`
- `name: String`
- `slug: String`
- `description: String`
- `shortDescription: String?`
- `price: Int`
- `compareAt: Int?`
- `costPrice: Int?`
- `stock: Int`
- `lowStockThreshold: Int`
- `sku: String?`
- `realSku: String?`
- `barcode: String?`
- `supplierId: String?`
- `supplier: Supplier?`
- `manufacturedDate: DateTime?`
- `expiryDate: DateTime?`
- `periodAfterOpening: Int?`
- `batchNumber: String?`
- `volume: String?`
- `volumeMl: Decimal?`
- `weightGrams: Decimal?`
- `images: String`
- `videoUrl: String?`
- `skinType: String?`
- `shades: String?`
- `ingredients: String?`
- `ingredientsRw: String?`
- `size: String?`
- `usageInstructions: String?`
- `howToUse: String?`
- `howToUseRw: String?`
- `warnings: String?`
- `warningsRw: String?`
- `allergens: String[]`
- `hairType: HairType?`
- `shade: String?`
- `shadeHex: String?`
- `undertone: String?`
- `fragranceNotes: Json?`
- `expectedResults: String?`
- `expectedResultsRw: String?`
- `resultsTimeframe: String?`
- `isAuthentic: Boolean`
- `authenticityInfo: String?`
- `countryOfOrigin: String?`
- `importedBy: String?`
- `rating: Float`
- `reviewsCount: Int`
- `featured: Boolean`
- `isNew: Boolean`
- `isActive: Boolean`
- `minWholesaleQty: Int`
- `wholesaleActive: Boolean`
- `isDeleted: Boolean`
- `deletedAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `categoryId: String`
- `category: Category`
- `brandId: String?`
- `brand: Brand?`
- `orderItems: OrderItem[]`
- `reviews: Review[]`
- `wishlistItems: Wishlist[]`
- `cartItems: CartItem[]`
- `pricing: ProductPricing?`
- `productImages: ProductImage[]`
- `batches: ProductBatch[]`
- `bundles: BundleProduct[]`
- `reorderReminders: ReorderReminder[]`
- `stockAlerts: StockAlert[]`

### `Supplier`

- `id: String`
- `name: String`
- `email: String?`
- `phone: String?`
- `address: String?`
- `country: String?`
- `isActive: Boolean`
- `products: Product[]`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `ProductImage`

- `id: String`
- `productId: String`
- `product: Product`
- `publicId: String`
- `url: String`
- `altText: String`
- `altTextRw: String?`
- `imageType: ImageType`
- `sortOrder: Int`
- `isPrimary: Boolean`
- `createdAt: DateTime`

### `ProductBatch`

- `id: String`
- `productId: String`
- `product: Product`
- `batchNumber: String`
- `quantity: Int`
- `manufacturedDate: DateTime?`
- `expiryDate: DateTime?`
- `receivedDate: DateTime`
- `supplierInvoice: String?`
- `notes: String?`
- `isActive: Boolean`
- `createdAt: DateTime`

### `Bundle`

- `id: String`
- `name: String`
- `nameRw: String?`
- `slug: String`
- `description: String?`
- `descriptionRw: String?`
- `bundleType: BundleType`
- `bundlePrice: Int`
- `normalTotal: Int`
- `coverImage: String?`
- `coverImageUrl: String?`
- `isActive: Boolean`
- `isFeatured: Boolean`
- `isInStock: Boolean`
- `targetConcern: String?`
- `targetSkinType: String?`
- `targetHairType: String?`
- `targetCategory: String?`
- `usageInstructions: String?`
- `usageInstructionsRw: String?`
- `products: BundleProduct[]`
- `orderItems: OrderItem[]`
- `totalSales: Int`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `deletedAt: DateTime?`

### `BundleProduct`

- `id: String`
- `bundleId: String`
- `bundle: Bundle`
- `productId: String`
- `product: Product`
- `stepOrder: Int`
- `stepLabel: String?`
- `stepLabelRw: String?`
- `quantity: Int`
- `isOptional: Boolean`
- `createdAt: DateTime`

### `QuizResult`

- `id: String`
- `sessionId: String?`
- `userId: String?`
- `user: User?`
- `category: String`
- `mainConcern: String`
- `skinType: String?`
- `hairType: String?`
- `preferredResult: String`
- `budget: String`
- `sensitivity: String`
- `recommendedProductIds: String[]`
- `recommendedBundleIds: String[]`
- `language: String`
- `createdAt: DateTime`

### `Cart`

- `id: String`
- `userId: String`
- `user: User`
- `totalItems: Int`
- `subtotal: Int`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `items: CartItem[]`
- `abandonedReminder: AbandonedCartReminder?`

### `CartItem`

- `id: String`
- `cartId: String`
- `cart: Cart`
- `productId: String`
- `product: Product`
- `quantity: Int`
- `price: Int`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `Order`

- `id: String`
- `orderNumber: String`
- `customerName: String`
- `customerPhone: String`
- `customerEmail: String?`
- `userId: String?`
- `user: User?`
- `address: String`
- `city: String`
- `district: String?`
- `sector: String?`
- `province: String`
- `notes: String?`
- `subtotal: Int`
- `discountAmount: Int`
- `deliveryFee: Int`
- `total: Int`
- `couponId: String?`
- `coupon: Coupon?`
- `loyaltyPointsEarned: Int`
- `status: String`
- `orderType: String`
- `priceType: String`
- `isCredit: Boolean`
- `creditDueDate: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `items: OrderItem[]`
- `payments: Payment[]`
- `delivery: Delivery?`
- `reviews: Review[]`
- `reviewRequests: ReviewRequest[]`
- `wholesaleInvoice: WholesaleInvoice?`
- `reorderReminders: ReorderReminder[]`

### `OrderItem`

- `id: String`
- `orderId: String`
- `order: Order`
- `productId: String?`
- `product: Product?`
- `bundleId: String?`
- `bundle: Bundle?`
- `name: String`
- `price: Int`
- `quantity: Int`
- `image: String?`
- `shade: String?`
- `createdAt: DateTime`

### `Payment`

- `id: String`
- `orderId: String`
- `order: Order`
- `method: String`
- `providerTransactionId: String?`
- `providerReference: String?`
- `amount: Int`
- `status: String`
- `phoneNumber: String?`
- `cardLast4: String?`
- `cardBrand: String?`
- `failureReason: String?`
- `network: String?`
- `webhookData: String?`
- `initiatedAt: DateTime`
- `completedAt: DateTime?`

### `PaymentAttempt`

- `id: String`
- `orderId: String`
- `phone: String`
- `amount: Int`
- `network: String`
- `reference: String?`
- `status: String`
- `attemptCount: Int`
- `lastError: String?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `Delivery`

- `id: String`
- `orderId: String`
- `order: Order`
- `status: String`
- `driverName: String?`
- `driverPhone: String?`
- `vehiclePlate: String?`
- `trackingCode: String?`
- `estimatedArrival: DateTime?`
- `actualArrival: DateTime?`
- `failureReason: String?`
- `notes: String?`
- `assignedAt: DateTime?`
- `pickedUpAt: DateTime?`
- `deliveredAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `Review`

- `id: String`
- `productId: String`
- `product: Product`
- `userId: String?`
- `user: User?`
- `orderId: String?`
- `order: Order?`
- `orderNumber: String?`
- `rating: Int`
- `title: String?`
- `body: String?`
- `photos: String?`
- `skinType: String?`
- `hairType: HairType?`
- `shadeUsed: String?`
- `shadeMatched: Boolean?`
- `isVerified: Boolean`
- `isApproved: Boolean`
- `isFeatured: Boolean`
- `isHidden: Boolean`
- `moderationReason: String?`
- `helpfulVotes: Int`
- `notHelpfulCount: Int`
- `votes: ReviewVote[]`
- `reports: ReviewReport[]`
- `merchantResponse: String?`
- `merchantResponseAt: DateTime?`
- `pointsAwarded: Int`
- `pointsAwardedAt: DateTime?`
- `isDeleted: Boolean`
- `deletedAt: DateTime?`
- `reviewRequest: ReviewRequest?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `ReviewRequest`

- `id: String`
- `orderId: String`
- `order: Order`
- `userId: String`
- `productId: String`
- `requestedAt: DateTime`
- `smsSent: Boolean`
- `smsSentAt: DateTime?`
- `smsClaimedAt: DateTime?`
- `smsAttempts: Int`
- `lastSmsError: String?`
- `reviewSubmitted: Boolean`
- `reviewId: String?`
- `review: Review?`

### `ReviewVote`

- `id: String`
- `reviewId: String`
- `review: Review`
- `userId: String`
- `isHelpful: Boolean`
- `createdAt: DateTime`

### `ReviewReport`

- `id: String`
- `reviewId: String`
- `review: Review`
- `reportedBy: String`
- `reason: String`
- `resolved: Boolean`
- `resolvedAt: DateTime?`
- `resolvedBy: String?`
- `createdAt: DateTime`

### `Wishlist`

- `id: String`
- `userId: String`
- `user: User`
- `productId: String`
- `product: Product`
- `createdAt: DateTime`

### `Address`

- `id: String`
- `userId: String`
- `user: User`
- `label: String`
- `recipientName: String`
- `recipientPhone: String`
- `province: String`
- `district: String`
- `sector: String`
- `cell: String?`
- `village: String?`
- `streetAddress: String?`
- `latitude: Float?`
- `longitude: Float?`
- `isDefault: Boolean`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `Coupon`

- `id: String`
- `code: String`
- `description: String?`
- `type: String`
- `value: Int`
- `minOrderAmount: Int?`
- `maxDiscountAmount: Int?`
- `usageLimit: Int?`
- `usageLimitPerUser: Int`
- `usedCount: Int`
- `startsAt: DateTime`
- `endsAt: DateTime?`
- `appliesToAllProducts: Boolean`
- `categoryIds: String?`
- `productIds: String?`
- `isActive: Boolean`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `orders: Order[]`

### `LoyaltyPoints`

- `id: String`
- `userId: String`
- `user: User`
- `points: Int`
- `type: String`
- `reason: String`
- `orderId: String?`
- `balanceAfter: Int`
- `expiresAt: DateTime?`
- `createdAt: DateTime`

### `BlogPost`

- `id: String`
- `title: String`
- `titleRw: String?`
- `slug: String`
- `excerpt: String?`
- `excerptRw: String?`
- `content: String`
- `contentRw: String?`
- `coverImage: String?`
- `imageAlt: String?`
- `imageAltRw: String?`
- `category: String?`
- `authorId: String?`
- `author: User?`
- `authorName: String?`
- `metaTitle: String?`
- `metaTitleRw: String?`
- `metaDescription: String?`
- `metaDescriptionRw: String?`
- `tags: String?`
- `status: String`
- `publishedAt: DateTime?`
- `viewCount: Int`
- `isDeleted: Boolean`
- `deletedAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `Banner`

- `id: String`
- `title: String`
- `subtitle: String?`
- `image: String`
- `mobileImage: String?`
- `linkType: String?`
- `linkUrl: String?`
- `placement: String`
- `startsAt: DateTime?`
- `endsAt: DateTime?`
- `sortOrder: Int`
- `isActive: Boolean`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `Notification`

- `id: String`
- `userId: String`
- `user: User`
- `type: String`
- `title: String`
- `body: String`
- `data: String?`
- `linkType: String?`
- `linkUrl: String?`
- `isRead: Boolean`
- `readAt: DateTime?`
- `channel: String`
- `sentAt: DateTime?`
- `createdAt: DateTime`

### `DeliveryZoneSettings`

- `id: String`
- `zoneName: String`
- `zoneCode: String`
- `baseFee: Int`
- `freeThreshold: Int`
- `estimatedDays: Int`
- `isSameDay: Boolean`
- `sameDayCutoff: String?`
- `isActive: Boolean`
- `updatedAt: DateTime`
- `createdAt: DateTime`

### `ActivityLog`

- `id: String`
- `userId: String?`
- `user: User?`
- `userName: String?`
- `userRole: String?`
- `action: String`
- `entityType: String?`
- `entityId: String?`
- `description: String?`
- `ipAddress: String?`
- `userAgent: String?`
- `severity: String`
- `createdAt: DateTime`

### `WholesaleApplication`

- `id: String`
- `userId: String`
- `user: User`
- `businessName: String`
- `businessType: String`
- `tradingName: String?`
- `tinNumber: String?`
- `rdbNumber: String?`
- `vatRegistered: Boolean`
- `businessPhone: String`
- `businessEmail: String?`
- `businessDistrict: String`
- `businessSector: String?`
- `businessAddress: String`
- `ownerName: String?`
- `nationalId: String?`
- `ownerPhone: String?`
- `ownerEmail: String?`
- `yearsInBusiness: Int?`
- `monthlyRevenue: String?`
- `estimatedMonthlyOrder: String?`
- `numberOfEmployees: Int?`
- `heardFrom: String?`
- `documents: String`
- `businessRegistrationDoc: String?`
- `tinCertificateDoc: String?`
- `ownerIdDoc: String?`
- `additionalDocs: String`
- `notes: String?`
- `status: String`
- `reviewedBy: String?`
- `reviewNotes: String?`
- `rejectionReason: String?`
- `reviewedAt: DateTime?`
- `approvedAt: DateTime?`
- `approvedBy: String?`
- `approvedCreditLimit: Int`
- `paymentTermsDays: Int`
- `discountTier: String?`
- `assignedAgentId: String?`
- `appliedAt: DateTime`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `ProductPricing`

- `id: String`
- `product: Product`
- `productId: String`
- `priceType: String`
- `retailPrice: Int`
- `tiers: WholesaleTier[]`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `WholesaleTier`

- `id: String`
- `pricing: ProductPricing`
- `pricingId: String`
- `tierName: String`
- `minQuantity: Int`
- `maxQuantity: Int?`
- `pricePerUnit: Int`
- `discountPercent: Int`

### `WholesaleCredit`

- `id: String`
- `user: User`
- `userId: String`
- `creditLimit: Int`
- `usedCredit: Int`
- `availableCredit: Int`
- `paymentTermDays: Int`
- `isActive: Boolean`
- `approvedAt: DateTime?`
- `approvedBy: String?`
- `totalPaid: Int`
- `totalOverdue: Int`
- `overdueDays: Int`
- `lastPaymentDate: DateTime?`
- `riskScore: Int`
- `creditRating: String`
- `isSuspended: Boolean`
- `suspendedAt: DateTime?`
- `suspensionReason: String?`
- `history: CreditHistory[]`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `CreditHistory`

- `id: String`
- `credit: WholesaleCredit`
- `creditId: String`
- `type: String`
- `amount: Int`
- `description: String`
- `orderId: String?`
- `createdAt: DateTime`

### `WholesaleInvoice`

- `id: String`
- `invoiceNumber: String`
- `order: Order`
- `orderId: String`
- `userId: String?`
- `user: User?`
- `businessName: String`
- `businessAddress: String`
- `tinNumber: String?`
- `businessRdb: String?`
- `subtotal: Int`
- `tax: Int`
- `discount: Int`
- `totalAmount: Int`
- `paidAmount: Int`
- `balanceDue: Int`
- `paymentTerms: String?`
- `dueDate: DateTime?`
- `isPaid: Boolean`
- `paidAt: DateTime?`
- `paymentMethod: String?`
- `isOverdue: Boolean`
- `daysOverdue: Int`
- `overdueRemindersSent: Int`
- `lastReminderDate: DateTime?`
- `pdfUrl: String?`
- `notes: String?`
- `issuedAt: DateTime`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `WholesaleReorder`

- `id: String`
- `userId: String`
- `originalOrderId: String`
- `newOrderId: String?`
- `createdAt: DateTime`

### `WholesaleRetentionMetric`

- `id: String`
- `userId: String`
- `firstOrderDate: DateTime?`
- `lastOrderDate: DateTime?`
- `totalOrders: Int`
- `totalSpent: Int`
- `averageOrderValue: Int`
- `daysSinceFirstOrder: Int?`
- `daysSinceLastOrder: Int?`
- `ordersPerMonthBps: Int`
- `status: String`
- `isChurned: Boolean`
- `churnedAt: DateTime?`
- `churnReason: String?`
- `reorderCount: Int`
- `reorderRateBps: Int`
- `updatedAt: DateTime`

### `StoreSettings`

- `id: String`
- `storeName: String`
- `storeShortName: String`
- `storeTagline: String?`
- `storeEmail: String?`
- `storePhone: String?`
- `storeWhatsApp: String?`
- `storeAddress: String?`
- `logoUrl: String?`
- `logoPublicId: String?`
- `faviconUrl: String?`
- `logoUpdatedAt: DateTime?`
- `primaryColor: String`
- `secondaryColor: String`
- `accentColor: String`
- `metaTitle: String?`
- `metaDescription: String?`
- `socialInstagram: String?`
- `socialFacebook: String?`
- `socialTikTok: String?`
- `socialYoutube: String?`
- `socialTwitter: String?`
- `currency: String`
- `timezone: String`
- `language: String`
- `updatedAt: DateTime`

### `WhatsAppClick`

- `id: String`
- `eventType: String`
- `productId: String?`
- `productSlug: String?`
- `cartTotal: Int?`
- `district: String?`
- `language: String`
- `pagePath: String?`
- `createdAt: DateTime`

### `SearchLog`

- `id: String`
- `query: String`
- `hasResults: Boolean`
- `resultCount: Int`
- `userId: String?`
- `sessionId: String?`
- `filters: Json?`
- `createdAt: DateTime`

### `NotFoundLog`

- `id: String`
- `path: String`
- `referrer: String?`
- `userAgent: String?`
- `ipHash: String?`
- `createdAt: DateTime`

### `AnalyticsEvent`

- `id: String`
- `event: String`
- `category: String?`
- `path: String?`
- `productId: String?`
- `productSlug: String?`
- `productCategory: String?`
- `searchQueryHash: String?`
- `device: String?`
- `district: String?`
- `language: String?`
- `paymentMethod: String?`
- `isNewUser: Boolean`
- `isKigali: Boolean`
- `sessionHash: String?`
- `userHash: String?`
- `value: Decimal?`
- `currency: String`
- `metadata: Json?`
- `createdAt: DateTime`

### `ReferralCode`

- `id: String`
- `userId: String`
- `user: User`
- `code: String`
- `isActive: Boolean`
- `pointsPerUse: Int?`
- `discountType: String?`
- `discountValue: Int?`
- `maxUses: Int?`
- `usedCount: Int`
- `startsAt: DateTime?`
- `endsAt: DateTime?`
- `policyConfiguredAt: DateTime?`
- `redemptions: ReferralRedemption[]`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `ReferralRedemption`

- `id: String`
- `referralCodeId: String`
- `referralCode: ReferralCode`
- `referredUserId: String`
- `referredUser: User`
- `referrerPointsAwarded: Int`
- `discountType: String?`
- `discountValue: Int?`
- `discountRedeemedAt: DateTime?`
- `status: String`
- `createdAt: DateTime`

### `BirthdayReward`

- `id: String`
- `userId: String`
- `user: User`
- `birthMonth: Int`
- `birthDay: Int`
- `rewardYear: Int`
- `rewardPoints: Int?`
- `status: String`
- `consentGranted: Boolean`
- `consentCheckedAt: DateTime?`
- `grantedAt: DateTime?`
- `redeemedAt: DateTime?`
- `expiresAt: DateTime?`
- `revokedAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `ReorderReminder`

- `id: String`
- `userId: String`
- `user: User`
- `productId: String`
- `product: Product`
- `sourceOrderId: String?`
- `sourceOrder: Order?`
- `estimatedDays: Int?`
- `dueAt: DateTime?`
- `channel: String?`
- `status: String`
- `consentGranted: Boolean`
- `consentCheckedAt: DateTime?`
- `sentAt: DateTime?`
- `cancelledAt: DateTime?`
- `lastErrorCode: String?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `AbandonedCartReminder`

- `id: String`
- `userId: String`
- `user: User`
- `cartId: String`
- `cart: Cart`
- `channel: String`
- `dueAt: DateTime`
- `status: String`
- `consentGranted: Boolean`
- `consentCheckedAt: DateTime?`
- `sentAt: DateTime?`
- `cancelledAt: DateTime?`
- `lastErrorCode: String?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `StockAlert`

- `id: String`
- `userId: String`
- `user: User`
- `productId: String`
- `product: Product`
- `alertType: String`
- `targetPrice: Int?`
- `channel: String?`
- `status: String`
- `consentGranted: Boolean`
- `consentCheckedAt: DateTime?`
- `sentAt: DateTime?`
- `cancelledAt: DateTime?`
- `lastErrorCode: String?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `CommunicationPreference`

- `id: String`
- `userId: String`
- `user: User`
- `language: String`
- `smsEnabled: Boolean`
- `whatsappEnabled: Boolean`
- `emailEnabled: Boolean`
- `smsConsentedAt: DateTime?`
- `whatsappConsentedAt: DateTime?`
- `emailConsentedAt: DateTime?`
- `smsRevokedAt: DateTime?`
- `whatsappRevokedAt: DateTime?`
- `emailRevokedAt: DateTime?`
- `reorderReminders: Boolean`
- `priceDropAlerts: Boolean`
- `backInStockAlerts: Boolean`
- `birthdayRewards: Boolean`
- `postDeliveryTips: Boolean`
- `abandonedCartReminders: Boolean`
- `wishlistReminders: Boolean`
- `reorderConsentedAt: DateTime?`
- `priceDropConsentedAt: DateTime?`
- `backInStockConsentedAt: DateTime?`
- `birthdayConsentedAt: DateTime?`
- `postDeliveryConsentedAt: DateTime?`
- `abandonedCartConsentedAt: DateTime?`
- `wishlistConsentedAt: DateTime?`
- `reorderRevokedAt: DateTime?`
- `priceDropRevokedAt: DateTime?`
- `backInStockRevokedAt: DateTime?`
- `birthdayRevokedAt: DateTime?`
- `postDeliveryRevokedAt: DateTime?`
- `abandonedCartRevokedAt: DateTime?`
- `wishlistRevokedAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `CustomerSegment`

- `id: String`
- `userId: String`
- `user: User`
- `segment: String`
- `isActive: Boolean`
- `definitionVersion: String?`
- `assignedAt: DateTime?`
- `calculatedAt: DateTime?`
- `expiresAt: DateTime?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `OtpVerification`

- `id: String`
- `phone: String`
- `type: String`
- `codeHash: String`
- `registrationData: Json?`
- `ipAddress: String?`
- `attempts: Int`
- `isUsed: Boolean`
- `usedAt: DateTime?`
- `expiresAt: DateTime`
- `createdAt: DateTime`

### `AdminActivityLog`

- `id: String`
- `userId: String`
- `userName: String`
- `userRole: String`
- `action: String`
- `resource: String`
- `resourceId: String?`
- `details: Json?`
- `ipAddress: String?`
- `userAgent: String?`
- `status: String`
- `createdAt: DateTime`

### `FailedLoginAttempt`

- `id: String`
- `phone: String?`
- `email: String?`
- `ipAddress: String?`
- `userAgent: String?`
- `reason: String?`
- `createdAt: DateTime`

### `SecurityAlert`

- `id: String`
- `type: String`
- `severity: String`
- `title: String`
- `message: String`
- `userId: String?`
- `ipAddress: String?`
- `isResolved: Boolean`
- `resolvedAt: DateTime?`
- `resolvedBy: String?`
- `metadata: Json?`
- `createdAt: DateTime`

### `StaffAccount`

- `id: String`
- `userId: String`
- `employeeName: String`
- `employeePhone: String`
- `department: String?`
- `createdBy: String`
- `isActive: Boolean`
- `lastActivityAt: DateTime?`
- `permissions: Json?`
- `notes: String?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

### `PasswordResetLog`

- `id: String`
- `userId: String`
- `requestedAt: DateTime`
- `completedAt: DateTime?`
- `ipAddress: String?`
- `wasSuccessful: Boolean`

### `MFAVerification`

- `id: String`
- `userId: String`
- `code: String`
- `type: String`
- `expiresAt: DateTime`
- `isUsed: Boolean`
- `createdAt: DateTime`

## Verification evidence

- TypeScript: zero errors.
- Build: compiled successfully; 58/58 static pages.
- ESLint: zero errors and zero warnings.
- Vitest: 559/559 tests across 91 files.
- Accessibility source checks: 14/14.
- Low-data tests: 46/46.
- Prisma schema validation: valid.
- Import resolution: 0 broken among 2,273 traced imports.
- Live deployed baseline page checks: 39/39 had no 5xx/network failure.
- Live deployed baseline GET API checks: 103/103 had no 5xx/network failure.
- Live deployed baseline invalid-input mutation checks: 122/122 had no 5xx/network failure.
- UI emoji scan: zero in app/component TSX.

## External limitations

- A real MTN MoMo debit was not initiated automatically because doing so requires owner-authorized credentials, a real payer phone, and explicit approval of a real charge.
- A real SMS was not sent automatically because it incurs provider cost and requires owner-controlled provider credentials.
- Physical TalkBack, VoiceOver, mobile-device, and 200% zoom checks remain manual launch gates.
- `npm audit` reports an upstream optional Sharp/libvips advisory inherited inside Next.js. The direct Sharp dependency is patched to 0.35.3; the current latest Next.js line still bundles Sharp 0.34.5. Runtime dependencies excluding optional packages report zero findings.
