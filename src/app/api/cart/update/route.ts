export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { PATCH as updateCart } from '@/app/api/cart/route'

/** Compatibility endpoint for clients that use PUT /api/cart/update. */
export async function PUT(request: NextRequest) {
  return updateCart(request)
}
