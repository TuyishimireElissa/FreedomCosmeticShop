import { createHmac } from 'node:crypto'
import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccessTokenFromRequest, verifyAccessToken } from '@/lib/auth'
import { resolveAuthSecret } from '@/lib/auth-secret'

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

function analyticsSecret() {
  return resolveAuthSecret(process.env.NEXTAUTH_SECRET, process.env.JWT_SECRET, process.env.NODE_ENV)
}

export function hashSearchValue(value: string, context: 'query' | 'session') {
  return `sha256:${createHmac('sha256', analyticsSecret())
    .update(`search-${context}-v1:${value}`)
    .digest('hex')
    .slice(0, 32)}`
}

export async function recordSearch(input: {
  request: NextRequest
  query: string
  resultCount: number
  sessionId?: string | null
  filters?: Prisma.InputJsonValue
}) {
  const normalizedQuery = normalizeSearchQuery(input.query)
  if (normalizedQuery.length < 2) return
  const session = normalizeSearchSession(input.sessionId)
  await prisma.searchLog.create({
    data: {
      // Search terms may contain names, contact details, or addresses. Store only
      // a deterministic HMAC identifier for recurrence counting.
      query: hashSearchValue(normalizedQuery, 'query'),
      hasResults: input.resultCount > 0,
      resultCount: Math.max(0, Math.trunc(input.resultCount)),
      userId: null,
      sessionId: session ? hashSearchValue(session, 'session') : null,
      filters: input.filters,
    },
  })
}
