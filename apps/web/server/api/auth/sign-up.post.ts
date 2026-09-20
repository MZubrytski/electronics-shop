import { SignUpInput } from '@shop/contracts'
import type { AuthResult } from '@shop/contracts'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, SignUpInput.parse)

  const result = await $fetch<AuthResult>('/auth/sign-up', {
    baseURL: apiBase(),
    method: 'POST',
    body,
    headers: clientAddressHeaders(event),
  })

  setSessionCookies(event, result.tokens)

  return result.user
})
