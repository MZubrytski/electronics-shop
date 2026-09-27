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
  <section class="mx-auto w-full max-w-md">
    <div class="rounded-lg border border-default bg-default p-6 sm:p-8">
      <h1 class="text-2xl font-bold text-highlighted">Create an account</h1>
      <p class="mt-2 text-sm text-muted">Place orders and keep track of them.</p>

      <UForm
        :schema="SignUpInput"
        :state="state"
        class="mt-6 flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" autocomplete="name" size="lg" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
          help="At least 8 characters"
          :ui="{ help: 'mt-2 text-toned' }"
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UButton type="submit" :loading="pending" size="lg" block class="mt-2">
          Create account
        </UButton>
      </UForm>
    </div>

    <p class="mt-4 text-center text-sm text-muted">
      Already registered?
      <NuxtLink to="/auth/sign-in" class="font-medium text-primary hover:underline"
        >Sign in</NuxtLink
      >
    </p>
  </section>
</template>
