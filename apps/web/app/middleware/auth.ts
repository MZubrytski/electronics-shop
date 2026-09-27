import { can, type Permission } from '@shop/contracts'

declare module 'vue-router' {
  interface RouteMeta {
    permission?: Permission
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSessionStore()
  await session.ensure()

  if (!session.isSignedIn) {
    return navigateTo(`/auth/sign-in?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const needed = to.meta.permission

  if (needed && !can(session.user!.role, needed)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', fatal: true })
  }
})
