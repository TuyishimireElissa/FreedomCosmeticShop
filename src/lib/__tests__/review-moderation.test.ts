import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const listApi = read('src/app/api/admin/reviews/route.ts')
const respondApi = read('src/app/api/admin/reviews/[id]/respond/route.ts')
const hideApi = read('src/app/api/admin/reviews/[id]/hide/route.ts')
const resolveApi = read('src/app/api/admin/reviews/[id]/resolve-reports/route.ts')
const view = read('src/components/admin/AdminReviewsView.tsx')
const page = read('src/app/admin/reviews/page.tsx')
const sidebar = read('src/components/admin/AdminSidebar.tsx')
const permissions = read('src/lib/permissions.ts')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('rating-neutral review moderation', () => {
  it('uses custom JWT permissions for every moderation API', () => {
    expect(permissions).toContain('REVIEWS_MODERATE: "reviews.moderate"')
    for (const source of [listApi, respondApi, hideApi, resolveApi]) {
      expect(source).toContain('requirePermission(PERMISSIONS.REVIEWS_MODERATE)')
      expect(source).not.toContain('getServerSession')
      expect(source).not.toContain('next-auth')
    }
  })

  it('never hides based on rating and permits only explicit abuse reasons', () => {
    expect(hideApi).toContain("z.enum(['SPAM','ABUSE','PRIVACY','LEGAL','DUPLICATE'])")
    expect(hideApi).not.toContain("'NEGATIVE'")
    expect(hideApi).not.toMatch(/rating\s*[:<>=].*isHidden|isHidden.*rating\s*[:<>=]/)
    expect(hideApi).not.toContain('review.delete')
    expect(hideApi).not.toContain('isDeleted: true')
    expect(hideApi).toContain("action: z.enum(['HIDE','RESTORE'])")
  })

  it('recalculates real public ratings and resolves reports after moderation', () => {
    expect(hideApi).toContain('recalculateProductReviewStats')
    expect(hideApi).toContain('reviewReport.updateMany')
    expect(resolveApi).toContain('resolved: true')
    expect(resolveApi).toContain('Resolved review reports without hiding the review.')
  })

  it('provides protected navigation, professional responses, restore, and no-violation resolution', () => {
    expect(page).toContain('<AdminReviewsView />')
    expect(sidebar).toContain("href: '/admin/reviews'")
    expect(view).toContain("t('reviews.admin_keep_negative')")
    expect(view).toContain("t('reviews.admin_respond_professionally')")
    expect(view).toContain("moderate(review.id, 'RESTORE')")
    expect(view).toContain('resolveReports(review.id)')
    expect(view).not.toContain('deleteReview')
  })

  it('has matching verified Kinyarwanda moderation translations', () => {
    for (const key of ['admin_title','admin_keep_negative','admin_hide_only_abuse','admin_respond_professionally','admin_tab_reported','admin_restore','admin_reason_spam','admin_confirm_hide','admin_reports_resolved']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
