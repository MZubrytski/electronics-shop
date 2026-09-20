import { deleteCookie, setCookie, type H3Event } from 'h3'
import type { AuthTokens } from '@shop/contracts'

export const ACCESS_COOKIE = 'access'
export const REFRESH_COOKIE = 'refresh'

function baseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    // A narrower path would never reach the page request that renews the session.
    path: '/',
  } as const
}

export function setSessionCookies(event: H3Event, tokens: AuthTokens): void {
  setCookie(event, ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: 15 * 60,
  })

  setCookie(event, REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: 30 * 24 * 60 * 60,
  })
}

export function clearSessionCookies(event: H3Event): void {
  deleteCookie(event, ACCESS_COOKIE, { ...baseOptions() })
  deleteCookie(event, REFRESH_COOKIE, { ...baseOptions() })
}
