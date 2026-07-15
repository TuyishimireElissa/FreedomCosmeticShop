/**
 * Safe Prisma seed entry point.
 *
 * The old destructive demo seed was intentionally retired. It deleted orders,
 * users, products, and other production data and created fictional products,
 * ratings, and review counts.
 *
 * This wrapper now delegates to the additive real-product importer. The
 * importer requires an explicit file, validates it, defaults to dry-run mode,
 * never deletes records, and requires production project confirmation before
 * applying changes.
 */
import './import-real-products'
