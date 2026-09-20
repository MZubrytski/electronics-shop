<script setup lang="ts">
import { useSessionStore } from '../stores/session'

const session = useSessionStore()
const router = useRouter()

async function onSignOut() {
  await session.signOut()
  await router.push('/')
}
</script>

<template>
  <header class="border-b border-default">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
      <NuxtLink to="/" class="text-lg font-semibold">Electronics Shop</NuxtLink>

      <nav class="flex items-center gap-3">
        <template v-if="session.isSignedIn">
          <span class="text-sm text-muted">{{ session.user?.name }}</span>
          <UButton variant="ghost" color="neutral" @click="onSignOut">Sign out</UButton>
        </template>
        <template v-else>
          <UButton to="/auth/sign-in" variant="ghost" color="neutral">Sign in</UButton>
          <UButton to="/auth/sign-up" variant="outline">Sign up</UButton>
        </template>
      </nav>
    </div>
  </header>
</template>
