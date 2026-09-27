import { createTestingPinia } from '@pinia/testing'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '@shop/contracts'
import { useSessionStore } from '../stores/session'
import authMiddleware from './auth'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(() => 'navigated') }))
mockNuxtImport('navigateTo', () => navigateToMock)

const MANAGER: SessionUser = {
  id: 'u1',
  email: 'manager@demo.shop',
  name: 'Demo Manager',
  role: 'admin',
}

function route(path: string, permission?: string) {
  return { fullPath: path, meta: permission ? { permission } : {} }
}

let served: SessionUser | null = null
let meCalls = 0

registerEndpoint('/api/auth/me', {
  method: 'GET',
  handler: () => {
    meCalls += 1
    return served
  },
})

function withRealStore(user: SessionUser | null) {
  served = user
  meCalls = 0
  setActivePinia(createPinia())
  return useSessionStore()
}

function signedInAs(user: SessionUser | null) {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, initialState: { session: { user } } }))
  return useSessionStore()
}

describe('auth middleware', () => {
  beforeEach(() => {
    navigateToMock.mockClear()
  })

  it('sends a guest to sign-in and remembers where they were headed', async () => {
    signedInAs(null)

    await authMiddleware(route('/admin/orders') as never, route('/') as never)

    expect(navigateToMock).toHaveBeenCalledWith('/auth/sign-in?redirect=%2Fadmin%2Forders')
  })

  it('lets a signed-in person through when the page asks for no permission', async () => {
    signedInAs(MANAGER)

    const result = await authMiddleware(route('/account/profile') as never, route('/') as never)

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('lets them through when the role holds the permission', async () => {
    signedInAs(MANAGER)

    const result = await authMiddleware(
      route('/admin', 'dashboard:read') as never,
      route('/') as never,
    )

    expect(result).toBeUndefined()
  })

  it('answers 403 instead of redirecting when the permission is missing', async () => {
    signedInAs(MANAGER)

    await expect(
      authMiddleware(route('/admin/users', 'user:manage') as never, route('/') as never),
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('asks for the session before judging it', async () => {
    const session = signedInAs(MANAGER)

    await authMiddleware(route('/admin', 'dashboard:read') as never, route('/') as never)

    expect(session.ensure).toHaveBeenCalled()
  })

  it('waits for the real session before deciding, not just for the call', async () => {
    const session = withRealStore(MANAGER)

    const result = await authMiddleware(
      route('/admin', 'dashboard:read') as never,
      route('/') as never,
    )

    expect(meCalls).toBe(1)
    expect(session.user?.email).toBe('manager@demo.shop')
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('still turns a guest away when the session really comes back empty', async () => {
    withRealStore(null)

    await authMiddleware(route('/admin') as never, route('/') as never)

    expect(meCalls).toBe(1)
    expect(navigateToMock).toHaveBeenCalledWith('/auth/sign-in?redirect=%2Fadmin')
  })
})
