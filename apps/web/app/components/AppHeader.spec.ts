import { createTestingPinia } from '@pinia/testing'
import { renderSuspended } from '@nuxt/test-utils/runtime'
import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import AppHeader from './AppHeader.vue'
import { useSessionStore } from '../stores/session'

function render(user: unknown) {
  return renderSuspended(AppHeader, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: { session: { user } },
        }),
      ],
    },
  })
}

describe('AppHeader', () => {
  it('offers a guest the way in', async () => {
    await render(null)

    expect(screen.getByRole('link', { name: /sign in/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull()
  })

  it('greets the signed-in person and offers the way out', async () => {
    await render({
      id: 'u1',
      email: 'ada@example.test',
      name: 'Ada Lovelace',
      role: 'user',
    })

    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
  })

  it('signs out through the store', async () => {
    await render({
      id: 'u1',
      email: 'ada@example.test',
      name: 'Ada Lovelace',
      role: 'user',
    })

    const session = useSessionStore()
    await screen.getByRole('button', { name: /sign out/i }).click()

    expect(session.signOut).toHaveBeenCalled()
  })
})
