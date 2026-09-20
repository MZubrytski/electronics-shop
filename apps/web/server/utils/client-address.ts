import type { H3Event } from 'h3'

export function clientAddressHeaders(event: H3Event): Record<string, string> {
  const secret = useRuntimeConfig().internalRequestSecret

  if (!secret) return {}

  return {
    'x-client-address': getRequestIP(event, { xForwardedFor: true }) ?? 'unknown',
    'x-internal-secret': secret,
  }
}
