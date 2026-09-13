import type { AuthResult } from '@shop/contracts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = await $fetch<AuthResult>('/auth/sign-in', {
    baseURL: apiBase(),
    method: 'POST',
    body,
  })

  // The API answers with tokens; turning them into cookies is this app's job.
  setSessionCookies(event, result.tokens)

  return result.user
})
