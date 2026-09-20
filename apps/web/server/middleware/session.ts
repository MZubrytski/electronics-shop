import type { SessionUser } from '@shop/contracts'

declare module 'h3' {
  interface H3EventContext {
    session?: SessionUser | null
  }
}

export default defineEventHandler(async (event) => {
  if (!needsSession(event.path)) return

  event.context.session = await resolveSession(event)
})

function needsSession(path: string): boolean {
  if (path.startsWith('/api/')) return true

  const isAsset = path.startsWith('/_nuxt') || path.startsWith('/__nuxt') || path.includes('.')

  return !isAsset
}
