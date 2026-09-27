import { createTestingPinia } from '@pinia/testing'
import { renderSuspended } from '@nuxt/test-utils/runtime'
import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import type { Role } from '@shop/contracts'
import AdminNav from './AdminNav.vue'

function render(role: Role) {
  return renderSuspended(AdminNav, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            session: {
              user: { id: 'u1', email: 'demo@demo.shop', name: 'Demo', role },
            },
          },
        }),
      ],
    },
  })
}

describe('AdminNav', () => {
  it('shows a manager only their own sections', async () => {
    await render('admin')

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /users/i })).toBeNull()
  })

  it('shows the owner everything', async () => {
    await render('super_admin')

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /users/i })).toBeTruthy()
  })

  it('shows a customer nothing at all', async () => {
    await render('user')

    expect(screen.queryByRole('link')).toBeNull()
  })
})
