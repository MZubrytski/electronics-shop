<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />

    <div class="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-8">
      <aside class="w-48 shrink-0">
        <p class="mb-3 px-3 text-xs font-bold tracking-wider text-muted uppercase">Admin</p>
        <AdminNav />
      </aside>

      <main class="min-w-0 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
