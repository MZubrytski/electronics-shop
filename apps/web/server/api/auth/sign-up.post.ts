import { SignUpInput } from '@shop/contracts'
import type { AuthResult } from '@shop/contracts'

export default defineEventHandler(async (event) => {
  // Validated here too, not only in the API: a malformed body should come
  // back as a plain 400 from this app, without an upstream error that leaks
  // the API's address into the browser.
  const body = await readValidatedBody(event, SignUpInput.parse)

  const result = await $fetch<AuthResult>('/auth/sign-up', {
    baseURL: apiBase(),
    method: 'POST',
    body,
    headers: clientAddressHeaders(event),
  })

  // The API answers with tokens; turning them into cookies is this app's job,
  // because this app owns the origin the browser talks to.
  setSessionCookies(event, result.tokens)

  return result.user
})
