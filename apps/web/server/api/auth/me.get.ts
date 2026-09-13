import type { SessionUser } from '@shop/contracts'

export default defineEventHandler(async (event) => {
  try {
    return await callApi<SessionUser>(event, '/auth/me')
  } catch {
    // Not being signed in is an ordinary state for this route, not an error.
    return null
  }
})
