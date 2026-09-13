<script setup lang="ts">
import { SignUpInput } from '@shop/contracts'
import type { FormSubmitEvent } from '@nuxt/ui'

const session = useSessionStore()
const router = useRouter()
const toast = useToast()

const state = reactive({ name: '', email: '', password: '' })
const pending = ref(false)

async function onSubmit(event: FormSubmitEvent<SignUpInput>) {
  pending.value = true
  try {
    await session.signUp(event.data)
    await router.push('/')
  } catch (error) {
    const taken = (error as { statusCode?: number })?.statusCode === 409
    toast.add({
      title: taken ? 'This email is already registered' : 'Could not create the account',
      color: 'error',
    })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-sm space-y-6">
    <h1 class="text-2xl font-semibold">Create an account</h1>

    <UForm :schema="SignUpInput" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Name" name="name">
        <UInput v-model="state.name" autocomplete="name" class="w-full" />
      </UFormField>

      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>

      <UFormField label="Password" name="password" hint="At least 8 characters">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UButton type="submit" :loading="pending" block>Create account</UButton>
    </UForm>

    <p class="text-sm text-muted">
      Already registered?
      <NuxtLink to="/auth/sign-in" class="underline">Sign in</NuxtLink>
    </p>
  </section>
</template>
