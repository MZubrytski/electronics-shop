// Imported explicitly rather than relying on Nitro's auto-imports: these
// functions are also used from tests, which run outside Nitro.
import { deleteCookie, setCookie, type H3Event } from 'h3'
import type { AuthTokens } from '@shop/contracts'

export const ACCESS_COOKIE = 'access'
export const REFRESH_COOKIE = 'refresh'

/**
 * Cookie attributes live here and nowhere else.
 *
 * This app owns the origin the browser talks to, so it owns the cookies. The
 * API hands tokens back in the body and never sets a cookie itself: its own
 * `Path` would be a path on a different domain, and the browser would quietly
 * stop sending the cookie back.
 */
function baseOptions() {
  return {
    httpOnly: true,
    // Lax, not Strict: with Strict, following a link from a message would
    // open the shop signed out.
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
  } as const
}

export function setSessionCookies(event: H3Event, tokens: AuthTokens): void {
  setCookie(event, ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: 15 * 60,
  })

  // Path stays '/' on purpose, tempting as narrowing it is.
  //
  // Renewal happens while a *page* is being rendered, and a browser only
  // sends a cookie whose Path matches the URL it is requesting. Scoped to
  // '/api/auth', the refresh cookie would never arrive with a request for '/',
  // renewal could never run during server rendering, and the visitor would
  // appear signed out after fifteen minutes — silently, with no error.
  setCookie(event, REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: 30 * 24 * 60 * 60,
  })
}

export function clearSessionCookies(event: H3Event): void {
  deleteCookie(event, ACCESS_COOKIE, { ...baseOptions() })
  deleteCookie(event, REFRESH_COOKIE, { ...baseOptions() })
}
