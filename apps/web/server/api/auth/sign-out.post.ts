export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, REFRESH_COOKIE)

  if (refreshToken) {
    await $fetch('/auth/sign-out', {
      baseURL: apiBase(),
      method: 'POST',
      body: { refreshToken },
    }).catch(() => undefined)
  }

  clearSessionCookies(event)

  return { ok: true }
})
