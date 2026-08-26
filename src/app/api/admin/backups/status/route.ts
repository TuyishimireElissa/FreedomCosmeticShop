export const dynamic = 'force-dynamic'

/**
 * /api/admin/backups/status
 *
 * Read-only health and coverage report for the disaster-recovery system.
 *
 * ─── WHY THIS IS A STATUS ENDPOINT AND NOT "CREATE BACKUP" ───────────────
 *
 * The original plan called for POST /api/admin/backups/create, which would
 * write backups/latest-snapshot.json on the server. That cannot work here:
 * Vercel's serverless filesystem is read-only apart from /tmp, and
 * next.config.js uses output:'standalone', so the backups/ directory is not
 * even shipped to the function. A "create" button wired that way would fail
 * every single time it was pressed, on production only.
 *
 * The same limitation means this route cannot read the nightly snapshot file
 * either. So instead of reporting on a file it cannot see, it reports on the
 * one thing it CAN see truthfully: the live database. Counts here are what a
 * backup taken right now would contain.
 *
 * Instant backup is served by the existing GET /api/admin/backup, which streams
 * a JSON attachment straight to the browser and never touches disk. There is
 * deliberately no second write-path for backup data.
 *
 * The nightly automated snapshot lives in git and in GitHub Actions artifacts,
 * produced by .github/workflows/daily-store-backup.yml.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

/** Cloudinary is checked by asking for one real asset, not by trusting config. */
async function checkCloudinary(sampleUrl: string | null): Promise<{ ok: boolean; detail: string }> {
  if (!sampleUrl) return { ok: false, detail: 'No product images to sample' }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(sampleUrl, { method: 'HEAD', signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)
    return response.ok
      ? { ok: true, detail: `Sample image responded ${response.status}` }
      : { ok: false, detail: `Sample image responded ${response.status}` }
  } catch (error) {
    return { ok: false, detail: error instanceof Error && error.name === 'AbortError' ? 'Timed out after 5s' : 'Unreachable' }
  }
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.SETTINGS_UPDATE)

    const startedAt = Date.now()

    const [
      products, productImages, categories, brands,
      coupons, deliveryZones, storeSettings, users, orders,
      newestProduct, sampleImage, proxiedImages,
    ] = await Promise.all([
      db.product.count(),
      db.productImage.count(),
      db.category.count(),
      db.brand.count(),
      db.coupon.count(),
      db.deliveryZoneSettings.count(),
      db.storeSettings.count(),
      db.user.count(),
      db.order.count(),
      db.product.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
      db.productImage.findFirst({ where: { url: { contains: '/image/upload/' } }, select: { url: true } }),
      // /image/fetch/ rows proxy somebody else's server. If that host dies the
      // image is gone and no backup can bring it back — say so plainly.
      db.productImage.count({ where: { url: { contains: '/image/fetch/' } } }),
    ])

    const databaseMs = Date.now() - startedAt
    const cloudinary = await checkCloudinary(sampleImage?.url ?? null)

    return NextResponse.json({
      success: true,
      data: {
        // What a backup taken right now would hold.
        coverage: {
          products, productImages, categories, brands,
          coupons, deliveryZones, storeSettings, users, orders,
        },
        lastCatalogueChange: newestProduct?.updatedAt?.toISOString() ?? null,
        warnings: proxiedImages > 0
          ? [`${proxiedImages} image(s) are remote proxies, not stored in Cloudinary. A backup records the URL but cannot restore the file if the remote host disappears.`]
          : [],
        services: {
          database: { ok: true, detail: `Responded in ${databaseMs}ms` },
          cloudinary,
          // The function is executing, so the platform is up by definition.
          hosting: {
            ok: true,
            detail: process.env.VERCEL_ENV
              ? `Vercel ${process.env.VERCEL_ENV}${process.env.VERCEL_GIT_COMMIT_SHA ? ` · ${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)}` : ''}`
              : 'Running',
          },
        },
        automation: {
          workflow: '.github/workflows/daily-store-backup.yml',
          schedule: '00:00 UTC daily (02:00 Kigali)',
          // Stated, not guessed: this route genuinely cannot see the file.
          note: 'The nightly snapshot is stored in git and as a GitHub Actions artifact. This server cannot read it, so its timestamp is not shown here.',
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Backup status error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load backup status' }, { status: 500 })
  }
}
