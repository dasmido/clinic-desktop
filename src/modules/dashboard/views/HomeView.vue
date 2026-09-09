<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="min-h-full flex flex-col items-center justify-center gap-4">
    <h1 class="text-2xl font-bold">{{ t('home.title') }}</h1>
    <p>{{ t('home.subtitle') }}</p>

    <UButton :label="t('home.cta')" />
  </section>
</template>