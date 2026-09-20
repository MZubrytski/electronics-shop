import type { H3Event } from 'h3'
import { ACCESS_COOKIE } from './session-cookies'

export function apiBase(): string {
  return useRuntimeConfig().apiUrl
}

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
