<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const clinicName = ref('MyClinic')
</script>

<template>
  <section class="mx-auto w-full max-w-3xl space-y-6">
    <header>
      <h1 class="text-2xl font-bold">{{ t('settingsGeneral.title') }}</h1>
      <p class="text-muted mt-1">{{ t('settingsGeneral.subtitle') }}</p>
    </header>

    <UCard>
      <form class="space-y-5" @submit.prevent>
        <UFormField :label="t('settingsGeneral.clinicName')" name="clinicName">
          <UInput
            v-model="clinicName"
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

        <div class="flex justify-end">
          <UButton type="submit" :label="t('settingsGeneral.save')" />
        </div>
      </form>
    </UCard>
  </section>
</template>