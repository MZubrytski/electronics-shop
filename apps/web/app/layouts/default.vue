<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <slot />
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
        A portfolio project. Not a real shop.
      </div>
    </footer>
  </div>
</template>
