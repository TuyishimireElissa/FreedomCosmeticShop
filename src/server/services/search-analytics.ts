import { createHmac } from 'node:crypto'
import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccessTokenFromRequest, verifyAccessToken } from '@/lib/auth'
import { resolveAuthSecret } from '@/lib/auth-secret'
import { matchControlledTerm } from '@/lib/search-vocabulary'

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

  /**
   * Record WHICH known catalogue word the query referred to, never the query.
   *
   * The hash above is deliberately irreversible, so the log can count that a
   * search recurred but can never say what it was. That makes "what do people
   * search for?" unanswerable — which is the correct default when search text
   * may contain a name or a phone number.
   *
   * A controlled vocabulary threads the needle: only a word already published
   * in our own catalogue vocabulary is stored, and only as an exact match from
   * that fixed list. Nothing a customer types is ever persisted verbatim, and
   * an unrecognised query records nothing at all.
   */
  const controlledTerm = matchControlledTerm(normalizedQuery)

  await prisma.searchLog.create({
    data: {
      // Search terms may contain names, contact details, or addresses. Store only
      // a deterministic HMAC identifier for recurrence counting.
      query: hashSearchValue(normalizedQuery, 'query'),
      hasResults: input.resultCount > 0,
      resultCount: Math.max(0, Math.trunc(input.resultCount)),
      userId: null,
      sessionId: session ? hashSearchValue(session, 'session') : null,
      // Merged into the existing JSON column rather than adding a column, so
      // this needs no migration against a database with no migration table.
      filters: controlledTerm
        ? { ...(typeof input.filters === 'object' && input.filters !== null && !Array.isArray(input.filters) ? input.filters : {}), term: controlledTerm }
        : input.filters,
    },
  })
}
