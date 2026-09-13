<script setup lang="ts">
import { SignInInput } from '@shop/contracts'
import type { FormSubmitEvent } from '@nuxt/ui'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const state = reactive({ email: '', password: '' })
const pending = ref(false)

async function onSubmit(event: FormSubmitEvent<SignInInput>) {
  pending.value = true
  try {
    await session.signIn(event.data)
    // Back where the visitor was headed before the sign-in wall.
    await router.push((route.query.redirect as string) || '/')
  } catch {
    toast.add({ title: 'Invalid email or password', color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-sm space-y-6">
    <h1 class="text-2xl font-semibold">Sign in</h1>

    <UForm :schema="SignInInput" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>

      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UButton type="submit" :loading="pending" block>Sign in</UButton>
    </UForm>

    <p class="text-sm text-muted">
      No account yet?
      <NuxtLink to="/auth/sign-up" class="underline">Create one</NuxtLink>
    </p>
  </section>
</template>
