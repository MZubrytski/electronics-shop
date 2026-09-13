import type { SessionUser } from '@shop/contracts'

declare module 'h3' {
  interface H3EventContext {
    /** Who is signed in, resolved once per request. Null for a guest. */
    session?: SessionUser | null
  }
}

/**
 * Resolves the session on **this** request, before anything else runs.
 *
 * It has to happen here rather than inside a server route because renewing
 * writes cookies, and only cookies written on the real incoming request reach
 * the browser. A route reached through an internal `$fetch` during server
 * rendering gets its own throwaway response, and its Set-Cookie headers are
 * dropped on the floor — the rotated token would be stored by the API and
 * never by the browser, so the next reload would look like a replay and kill
 * the whole session.
 */
export default defineEventHandler(async (event) => {
  // Only where the answer is used: pages and this app's own API. Resolving
  // the session for an icon or a static file costs a round trip to the API
  // and adds one more request to race with over the same token.
  if (!needsSession(event.path)) return

  event.context.session = await resolveSession(event)
})

function needsSession(path: string): boolean {
  if (path.startsWith('/api/')) return true

  const isAsset = path.startsWith('/_nuxt') || path.startsWith('/__nuxt') || path.includes('.')

  return !isAsset
}
