import { createTestingPinia } from '@pinia/testing'
import { renderSuspended } from '@nuxt/test-utils/runtime'
import { fireEvent, screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import SignInPage from './sign-in.vue'

async function render() {
  return renderSuspended(SignInPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
  })
}

describe('sign-in page', () => {
  it('stays quiet until a field has been touched', async () => {
    await render()

    // Greeting someone with red text before they typed anything is rude and
    // tells them nothing.
    expect(screen.queryByText(/invalid/i)).toBeNull()
  })

  it('complains about a malformed address once the field is left', async () => {
    await render()

    const email = screen.getByLabelText(/email/i)
    await fireEvent.update(email, 'not-an-email')
    await fireEvent.blur(email)

    expect(await screen.findByText(/invalid/i)).toBeTruthy()
  })
})
