export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, REFRESH_COOKIE)

  if (refreshToken) {
    // A failure here must not stop the visitor from signing out locally.
    await $fetch('/auth/sign-out', {
      baseURL: apiBase(),
      method: 'POST',
      body: { refreshToken },
    }).catch(() => undefined)
  }

  clearSessionCookies(event)

  return { ok: true }
})
