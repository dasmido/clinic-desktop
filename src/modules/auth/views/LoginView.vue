<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { login } = useAuth()

const username = ref('')
const password = ref('')
const loading = ref(false)

function formatLoginError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  const ipcPrefix = "Error invoking remote method 'auth:login': "

  return message.startsWith(ipcPrefix) ? message.slice(ipcPrefix.length) : message
}

async function onSubmit() {
  loading.value = true
  try {
    await login(username.value, password.value)
    await router.push('/')
  } catch (err) {
    toast.add({
      title: t('auth.loginTitle'),
      description: formatLoginError(err),
      color: 'error',
    })
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

        <UButton type="submit" block :loading="loading" :label="t('auth.login')" />
      </form>
    </UCard>
  </section>
</template>