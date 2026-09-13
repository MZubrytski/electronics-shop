import type { H3Event } from 'h3'
import type { AuthResult } from '@shop/contracts'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from './session-cookies'

export function apiBase(): string {
  return useRuntimeConfig().apiUrl
}

/**
 * Calls the API on behalf of the current visitor.
 *
 * When the access token has expired, renews the session and retries — once.
 * Renewing lives here rather than in the browser because pages are rendered
 * on the server: at that moment there is no browser code to intercept
 * anything, and the first reload with a stale token would render as a guest.
 */
export async function callApi<T>(
  event: H3Event,
  path: string,
  options: Record<string, unknown> = {},
): Promise<T> {
  const accessToken = getCookie(event, ACCESS_COOKIE)

  try {
    return await request<T>(path, accessToken, options)
  } catch (error) {
    if (!isUnauthorised(error)) throw error

    const renewed = await renew(event)
    if (!renewed) throw error

    // Exactly one retry: a second 401 means the session is really over, and
    // retrying again would loop.
    return request<T>(path, renewed, options)
  }
}

function request<T>(
  path: string,
  accessToken: string | undefined,
  options: Record<string, unknown>,
): Promise<T> {
  return $fetch<T>(path, {
    baseURL: apiBase(),
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
}

/** Returns the fresh access token, or null when the session is over. */
async function renew(event: H3Event): Promise<string | null> {
  const refreshToken = getCookie(event, REFRESH_COOKIE)
  if (!refreshToken) return null

  try {
    const result = await $fetch<AuthResult>('/auth/refresh', {
      baseURL: apiBase(),
      method: 'POST',
      body: { refreshToken },
    })

    setSessionCookies(event, result.tokens)
    return result.tokens.accessToken
  } catch {
    clearSessionCookies(event)
    return null
  }
}

function isUnauthorised(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === 401
  )
}
