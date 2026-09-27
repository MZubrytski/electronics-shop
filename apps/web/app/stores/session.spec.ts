import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from './session'

let calls = 0

registerEndpoint('/api/auth/sign-out', {
  method: 'POST',
  handler: () => {
    calls += 1
    return { ok: true }
  },
})

let meCalls = 0

registerEndpoint('/api/auth/me', {
  method: 'GET',
  handler: () => {
    meCalls += 1
    return null
  },
})

const person = {
  id: 'u1',
  email: 'ada@example.test',
  name: 'Ada Lovelace',
  role: 'user' as const,
}

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    calls = 0
    meCalls = 0
  })

  it('starts out as a guest', () => {
    const session = useSessionStore()

    expect(session.user).toBeNull()
    expect(session.isSignedIn).toBe(false)
  })

  it('knows who is signed in', () => {
    const session = useSessionStore()
    session.set(person)

    expect(session.isSignedIn).toBe(true)
    expect(session.user?.name).toBe('Ada Lovelace')
  })

  it('stays a guest when the session endpoint answers 204', async () => {
    const session = useSessionStore()
    await session.ensure()

    expect(session.user).toBeNull()
    expect(session.isSignedIn).toBe(false)
  })

  it('asks for the session once, however often it is called', async () => {
    const session = useSessionStore()
    await session.ensure()
    await session.ensure()

    expect(meCalls).toBe(1)
  })

  it('clears the person on sign-out', async () => {
    const session = useSessionStore()
    session.set(person)
    await session.signOut()

    expect(calls).toBe(1)
    expect(session.user).toBeNull()
    expect(session.isSignedIn).toBe(false)
  })
})
