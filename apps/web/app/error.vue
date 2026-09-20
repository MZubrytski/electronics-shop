<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const COPY: Record<number, { title: string; text: string }> = {
  403: {
    title: 'No access to this page',
    text: 'The page exists, but your account is not allowed to open it. If that looks wrong, ask the shop owner.',
  },
  404: {
    title: 'Page not found',
    text: 'The address is wrong, or the page has moved.',
  },
}

const copy = computed(
  () =>
    COPY[props.error.statusCode] ?? {
      title: 'Something went wrong',
      text: 'The page could not be loaded. Try again in a moment.',
    },
)
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
    <p class="text-label font-bold tracking-label text-muted uppercase">
      Error {{ error.statusCode }}
    </p>
    <h1 class="text-2xl font-bold tracking-title text-highlighted">{{ copy.title }}</h1>
    <p class="max-w-prose text-meta text-toned">{{ copy.text }}</p>

    <button
      type="button"
      class="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-inverted"
      @click="clearError({ redirect: '/' })"
    >
      Back to the shop
    </button>
  </div>
</template>
