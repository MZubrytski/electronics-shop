<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', permission: 'dashboard:read' })
</script>

<template>
  <section class="flex flex-col gap-2">
    <h1 class="text-2xl font-bold tracking-title text-highlighted">Dashboard</h1>
    <p class="text-meta text-muted">Revenue and top products arrive in a later stage.</p>
  </section>
</template>
