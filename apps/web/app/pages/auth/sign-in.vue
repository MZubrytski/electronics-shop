<script setup lang="ts">
import { SignInInput } from '@shop/contracts'
import type { FormSubmitEvent } from '@nuxt/ui'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

const state = reactive({ email: '', password: '' })
const pending = ref(false)

async function onSubmit(event: FormSubmitEvent<SignInInput>) {
  pending.value = true
  try {
    await session.signIn(event.data)
    await router.push(safeRedirect(route.query.redirect))
  } catch {
    toast.add({ title: 'Invalid email or password', color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-md">
    <div class="rounded-lg border border-default bg-default p-6 sm:p-8">
      <h1 class="text-2xl font-bold tracking-title text-highlighted">Sign in</h1>
      <p class="mt-2 text-meta text-muted">Sign in to continue.</p>

      <UForm
        :schema="SignInInput"
        :state="state"
        class="mt-6 flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UButton type="submit" :loading="pending" size="lg" block class="mt-2">Sign in</UButton>
      </UForm>
    </div>

    <p class="mt-4 text-center text-meta text-muted">
      No account yet?
      <NuxtLink to="/auth/sign-up" class="font-medium text-primary hover:underline">
        Create one
      </NuxtLink>
    </p>
  </section>
</template>
