import type { H3Event } from 'h3'
import { ACCESS_COOKIE } from './session-cookies'

export function apiBase(): string {
  return useRuntimeConfig().apiUrl
}

/**
 * Calls the API on behalf of the current visitor.
 *
 * Renewal is not done here: it already happened in the session middleware, on
 * the real incoming request, which is the only place where a rotated cookie
 * can reach the browser. By the time a route runs, the access cookie is as
 * fresh as it is going to get.
 */
export function callApi<T>(
  event: H3Event,
  path: string,
  options: Record<string, unknown> = {},
): Promise<T> {
  const accessToken = getCookie(event, ACCESS_COOKIE)

  return $fetch<T>(path, {
    baseURL: apiBase(),
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
}
