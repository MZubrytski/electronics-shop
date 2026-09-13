import type { SessionUser } from '@shop/contracts'

/**
 * Fills the session on the server, before the first byte of HTML.
 *
 * Reads what the session middleware already resolved for this request rather
 * than fetching again: an internal fetch would make a second request whose
 * response — and whose renewed cookies — nobody would see.
 */
export default defineNuxtPlugin(() => {
  const event = useRequestEvent()
  const session = useSessionStore()

  session.set((event?.context.session ?? null) as SessionUser | null)
})
