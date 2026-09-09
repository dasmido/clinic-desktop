<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  titleKey: string
}>()

const { t } = useI18n()
</script>

<template>
  <section class="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-2">
    <h1 class="text-2xl font-bold">{{ t(titleKey) }}</h1>
    <p class="text-muted">{{ t('sections.empty') }}</p>
  </section>
</template>