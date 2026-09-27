<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const session = useSessionStore()
</script>

<template>
  <section class="mx-auto w-full max-w-md">
    <div class="rounded-lg border border-default bg-default p-6 sm:p-8">
      <h1 class="text-2xl font-bold text-highlighted">Profile</h1>

      <dl class="mt-6 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <dt class="text-sm text-muted">Name</dt>
          <dd class="text-base text-default">{{ session.user?.name }}</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="text-sm text-muted">Email</dt>
          <dd class="text-base text-default">{{ session.user?.email }}</dd>
        </div>
      </dl>

      <p class="mt-6 text-sm text-muted">A default delivery address arrives with checkout.</p>
    </div>
  </section>
</template>
