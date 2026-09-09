<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const { t } = useI18n()
const router = useRouter()
const { login } = useAuth()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value, password.value)
    await router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="flex h-screen items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-bold">{{ t('auth.loginTitle') }}</h1>
        <p class="text-muted mt-1">{{ t('auth.loginSubtitle') }}</p>
      </template>

      <form class="space-y-5" @submit.prevent="onSubmit">
        <UFormField :label="t('auth.username')" name="username">
          <UInput v-model="username" class="w-full" autofocus />
        </UFormField>

        <UFormField :label="t('auth.password')" name="password">
          <UInput v-model="password" type="password" class="w-full" />
        </UFormField>

        <p v-if="error" class="text-error text-sm">{{ error }}</p>

        <UButton type="submit" block :loading="loading" :label="t('auth.login')" />
      </form>
    </UCard>
  </section>
</template>