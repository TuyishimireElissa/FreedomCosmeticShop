import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccessTokenFromRequest, verifyAccessToken } from '@/lib/auth'

const SESSION_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/

export function normalizeSearchQuery(query: string) {
  return query.toLocaleLowerCase('rw-RW').trim().replace(/\s+/g, ' ').slice(0, 200)
}

export function normalizeSearchSession(sessionId: string | null | undefined) {
  const value = sessionId?.trim() || ''
  return SESSION_PATTERN.test(value) ? value : null
}

export async function authenticatedSearchUserId(request: NextRequest) {
  const token = getAccessTokenFromRequest(request)
  if (!token) return null
  const payload = await verifyAccessToken(token)
  return payload?.userId || null
}

export async function recordSearch(input: {
  request: NextRequest
  query: string
  resultCount: number
  sessionId?: string | null
  filters?: Prisma.InputJsonValue
}) {
  const query = normalizeSearchQuery(input.query)
  if (query.length < 2) return
  const userId = await authenticatedSearchUserId(input.request)
  await prisma.searchLog.create({
    data: {
      query,
      hasResults: input.resultCount > 0,
      resultCount: Math.max(0, Math.trunc(input.resultCount)),
      userId,
      sessionId: normalizeSearchSession(input.sessionId),
      filters: input.filters,
    },
  })
}
