import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from './session'

const person = {
  id: 'u1',
  email: 'ada@example.test',
  name: 'Ada Lovelace',
  role: 'user' as const,
}

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

  it('clears the person on sign-out', () => {
    const session = useSessionStore()
    session.set(person)
    session.clear()

    expect(session.user).toBeNull()
    expect(session.isSignedIn).toBe(false)
  })
})
