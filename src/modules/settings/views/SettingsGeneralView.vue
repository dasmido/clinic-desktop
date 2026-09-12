<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettings } from '@/modules/settings/composables/useAppSettings'

const { t } = useI18n()
const { settings, loadSettings, updateSettings } = useAppSettings()

const isLoading = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')

const form = ref({
  clinicName: '',
  currency: 'USD' as 'USD' | 'IQD',
  printPaperSize: 'A4' as 'A4' | '80MM',
  telegramNotificationsEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
})

function applySettingsToForm() {
  if (!settings.value) return
  form.value = {
    clinicName: settings.value.clinic_name,
    currency: settings.value.currency,
    printPaperSize: settings.value.print_paper_size,
    telegramNotificationsEnabled: settings.value.telegram_notifications_enabled,
    telegramBotToken: settings.value.telegram_bot_token,
    telegramChatId: settings.value.telegram_chat_id,
  }
}

async function save() {
  isLoading.value = true
  errorMessage.value = ''
  savedMessage.value = ''
  try {
    await updateSettings({
      clinic_name: form.value.clinicName.trim() || 'عيادتي',
      currency: form.value.currency,
      print_paper_size: form.value.printPaperSize,
      telegram_notifications_enabled: form.value.telegramNotificationsEnabled,
      telegram_bot_token: form.value.telegramBotToken.trim(),
      telegram_chat_id: form.value.telegramChatId.trim(),
    })
    savedMessage.value = t('settingsGeneral.saved')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'تعذر حفظ الإعدادات.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  applySettingsToForm()
})
</script>

<template>
  <section class="mx-auto w-full max-w-3xl space-y-6">
    <header>
      <h1 class="text-2xl font-bold">{{ t('settingsGeneral.title') }}</h1>
      <p class="text-muted mt-1">{{ t('settingsGeneral.subtitle') }}</p>
    </header>

    <UCard>
      <form class="space-y-5" @submit.prevent="save">
        <UFormField :label="t('settingsGeneral.clinicName')" name="clinicName">
          <UInput
            v-model="form.clinicName"
            class="w-full"
            :placeholder="t('settingsGeneral.clinicNamePlaceholder')"
          />
        </UFormField>

        <UFormField :label="t('settingsGeneral.language')" name="language">
          <USelect
            :items="[{ label: t('settingsGeneral.arabic'), value: 'ar' }]"
            model-value="ar"
            class="w-full"
          />
        </UFormField>

        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField :label="t('settingsGeneral.currency')" name="currency">
            <USelect
              v-model="form.currency"
              :items="[
                { label: t('settingsGeneral.usd'), value: 'USD' },
                { label: t('settingsGeneral.iqd'), value: 'IQD' },
              ]"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('settingsGeneral.printPaperSize')" name="printPaperSize">
            <USelect
              v-model="form.printPaperSize"
              :items="[
                { label: t('settingsGeneral.paperA4'), value: 'A4' },
                { label: t('settingsGeneral.paper80mm'), value: '80MM' },
              ]"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="border-t border-default pt-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-semibold text-highlighted">{{ t('settingsGeneral.telegramTitle') }}</h2>
              <p class="mt-1 text-sm text-muted">{{ t('settingsGeneral.telegramSubtitle') }}</p>
            </div>
            <USwitch v-model="form.telegramNotificationsEnabled" :label="t('settingsGeneral.telegramEnable')" />
          </div>

          <div v-if="form.telegramNotificationsEnabled" class="mt-4 grid gap-4 sm:grid-cols-2">
            <UFormField :label="t('settingsGeneral.telegramBotToken')" name="telegramBotToken">
              <UInput v-model="form.telegramBotToken" class="w-full" dir="ltr" />
            </UFormField>
            <UFormField :label="t('settingsGeneral.telegramChatId')" name="telegramChatId">
              <UInput v-model="form.telegramChatId" class="w-full" dir="ltr" />
            </UFormField>
          </div>
        </div>

        <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
        <p v-if="savedMessage" class="text-sm text-success">{{ savedMessage }}</p>

        <div class="flex justify-end">
          <UButton type="submit" :loading="isLoading" :label="t('settingsGeneral.save')" />
        </div>
      </form>
    </UCard>
  </section>
</template>
