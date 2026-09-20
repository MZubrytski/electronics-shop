<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', permission: 'user:manage' })
</script>

<template>
  <section class="flex flex-col gap-2">
    <h1 class="text-2xl font-bold tracking-title text-highlighted">Users</h1>
    <p class="text-meta text-muted">The list of people and their roles arrives in a later stage.</p>
  </section>
</template>
