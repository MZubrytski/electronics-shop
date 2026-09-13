<script setup lang="ts">
const session = useSessionStore()
</script>

<template>
  <section class="space-y-4">
    <h1 class="text-2xl font-semibold">Electronics Shop</h1>
    <p class="text-muted">
      <template v-if="session.isSignedIn">
        Signed in as {{ session.user?.email }}. The catalogue arrives in the next stage.
      </template>
      <template v-else>
        Sign in to see your account. The catalogue arrives in the next stage.
      </template>
    </p>
  </section>
</template>
