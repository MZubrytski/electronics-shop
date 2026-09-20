import type { H3Event } from 'h3'
import type { AuthResult, SessionUser } from '@shop/contracts'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from './session-cookies'

export async function resolveSession(event: H3Event): Promise<SessionUser | null> {
  const accessToken = getCookie(event, ACCESS_COOKIE)

  if (accessToken) {
    try {
      return await fetchUser(accessToken)
    } catch (error) {
      if (!isUnauthorised(error)) throw error
    }
  }

  const renewed = await renew(event)
  return renewed ? fetchUser(renewed) : null
}

function fetchUser(accessToken: string): Promise<SessionUser> {
  return $fetch<SessionUser>('/auth/me', {
    baseURL: apiBase(),
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

const inFlight = new Map<string, Promise<AuthResult | null>>()

async function renew(event: H3Event): Promise<string | null> {
  const refreshToken = getCookie(event, REFRESH_COOKIE)
  if (!refreshToken) return null

  const result = await (inFlight.get(refreshToken) ?? startRenewal(refreshToken))

  if (!result) {
    clearSessionCookies(event)
    return null
  }

  setSessionCookies(event, result.tokens)
  return result.tokens.accessToken
}

function startRenewal(refreshToken: string): Promise<AuthResult | null> {
  const pending = $fetch<AuthResult>('/auth/refresh', {
    baseURL: apiBase(),
    method: 'POST',
    body: { refreshToken },
  }).catch((error: unknown) => {
    if (!isUnauthorised(error)) throw error
    return null
  })

  inFlight.set(refreshToken, pending)

  return pending.finally(() => {
    inFlight.delete(refreshToken)
  })
}

export function isUnauthorised(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === 401
  )
}
