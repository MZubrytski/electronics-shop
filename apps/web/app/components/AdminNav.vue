<script setup lang="ts">
import { can, type Permission } from '@shop/contracts'

const session = useSessionStore()

const LINKS: Array<{ label: string; to: string; permission: Permission }> = [
  { label: 'Dashboard', to: '/admin', permission: 'dashboard:read' },
  { label: 'Users', to: '/admin/users', permission: 'user:manage' },
]

const links = computed(() =>
  LINKS.filter((link) => session.user && can(session.user.role, link.permission)),
)
</script>

<template>
  <nav class="flex flex-col gap-1" aria-label="Admin">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="rounded-md px-3 py-2 text-sm font-medium text-toned transition-colors hover:bg-muted hover:text-highlighted"
      active-class="bg-muted text-highlighted"
    >
      {{ link.label }}
    </NuxtLink>
  </nav>
</template>
