import type { SessionUser } from '@shop/contracts'

export default defineNuxtPlugin(() => {
  const event = useRequestEvent()
  const session = useSessionStore()

  session.set((event?.context.session ?? null) as SessionUser | null)
})
