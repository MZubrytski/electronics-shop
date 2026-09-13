/**
 * Fills the session on the server, before the first byte of HTML.
 *
 * Without this the page would render as a guest and then flip once the browser
 * caught up — the flash of a signed-out header that cookies were chosen to
 * avoid in the first place.
 */
export default defineNuxtPlugin(async () => {
  const session = useSessionStore()

  const user = await $fetch('/api/auth/me', {
    headers: useRequestHeaders(['cookie']),
  }).catch(() => null)

  session.set(user)
})
