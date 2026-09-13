import type { H3Event } from 'h3'

/**
 * Headers that tell the API who is really making this request.
 *
 * In production the browser never reaches the API directly — every call
 * arrives from this app's egress address. Without forwarding, the API's
 * per-address rate limit would put the entire shop on one shared budget:
 * ten wrong passwords from anybody would lock out everyone else.
 *
 * The secret is what makes the forwarded address trustworthy. Without it an
 * attacker hitting the API directly could claim a new address per request and
 * never hit the limit at all.
 */
export function clientAddressHeaders(event: H3Event): Record<string, string> {
  const secret = useRuntimeConfig().internalRequestSecret

  if (!secret) return {}

  return {
    'x-client-address': getRequestIP(event, { xForwardedFor: true }) ?? 'unknown',
    'x-internal-secret': secret,
  }
}
