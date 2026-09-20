import type { SessionUser } from '@shop/contracts'
import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)

  const isSignedIn = computed(() => user.value !== null)

  function set(next: SessionUser | null) {
    user.value = next
  }

  function clear() {
    user.value = null
  }

  async function signIn(credentials: { email: string; password: string }) {
    set(await $fetch<SessionUser>('/api/auth/sign-in', { method: 'POST', body: credentials }))
  }

  async function signUp(input: { email: string; password: string; name: string }) {
    set(await $fetch<SessionUser>('/api/auth/sign-up', { method: 'POST', body: input }))
  }

  async function signOut() {
    await $fetch('/api/auth/sign-out', { method: 'POST' })
    clear()
  }

  return { user, isSignedIn, set, clear, signIn, signUp, signOut }
})
