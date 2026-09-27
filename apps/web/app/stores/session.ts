import type { SessionUser } from '@shop/contracts'
import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const loaded = ref(false)

  const isSignedIn = computed(() => user.value !== null)

  function set(next: SessionUser | null | undefined) {
    user.value = next ?? null
    loaded.value = true
  }

  async function ensure() {
    if (loaded.value) return
    set(await $fetch<SessionUser | null>('/api/auth/me'))
  }

  function clear() {
    user.value = null
    loaded.value = true
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

  return { user, loaded, isSignedIn, set, clear, ensure, signIn, signUp, signOut }
})
