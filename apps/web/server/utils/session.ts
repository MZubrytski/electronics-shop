import type { H3Event } from 'h3'
import type { AuthResult, SessionUser } from '@shop/contracts'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from './session-cookies'

/**
 * Works out who is making this request, renewing the session if the short
 * access token has expired.
 *
 * Returns null only when there is genuinely no session. A failure to reach
 * the API is thrown, not swallowed: a cold-starting backend must not look
 * like a signed-out visitor.
 */
export async function resolveSession(event: H3Event): Promise<SessionUser | null> {
  const accessToken = getCookie(event, ACCESS_COOKIE)

  if (accessToken) {
    try {
      return await fetchUser(accessToken)
    } catch (error) {
      // Anything other than "this token is no good" is a real failure.
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

/**
 * Renewals in flight, keyed by the token being spent.
 *
 * One page load is several requests — the document, the icon, any data the
 * page asks for — and they all carry the same cookie. Left alone they each
 * try to renew: the first rotates the token, and every other one then presents
 * a token that has just been spent. The API cannot tell that apart from a
 * stolen token being replayed, so it revokes the whole session. The result is
 * a visitor thrown out by an ordinary reload.
 *
 * Sharing one renewal per token removes the race inside this process. A second
 * instance would need shared coordination; that is the same limitation the
 * rate limiter has, and the same future task.
 */
const inFlight = new Map<string, Promise<AuthResult | null>>()

/** Returns the fresh access token, or null when the session is over. */
async function renew(event: H3Event): Promise<string | null> {
  const refreshToken = getCookie(event, REFRESH_COOKIE)
  if (!refreshToken) return null

  const result = await (inFlight.get(refreshToken) ?? startRenewal(refreshToken))

  if (!result) {
    // The session really is over: stop sending a token that will never work
    // again, so the next request does not look like a replay either.
    clearSessionCookies(event)
    return null
  }

  // Every request that waited on this renewal writes the same new cookies,
  // so whichever response reaches the browser first carries a usable pair.
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

  // Keep the entry only as long as the renewal takes: it is a lock, not a
  // cache, and holding spent tokens forever would leak memory.
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
