<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ar } from '@nuxt/ui/locale'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const open = ref(true)
const databaseReady = ref(false)
const databaseError = ref('')
const databaseLoading = ref(true)

async function initializeDatabase() {
  databaseError.value = ''
  databaseLoading.value = true

  try {
    await window.electronAPI.database.isReady()
    databaseReady.value = true
  } catch (error) {
    databaseReady.value = false
    databaseError.value = error instanceof Error ? error.message : String(error)
  } finally {
    databaseLoading.value = false
  }
}

onMounted(() => {
  void initializeDatabase()
})
</script>

<template>
  <UApp :locale="ar">
    <section v-if="!databaseReady" class="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div class="flex flex-col items-center gap-4 text-center">
        <UIcon v-if="databaseLoading" name="i-lucide-loader-circle" class="size-9 animate-spin text-primary" />
        <UIcon v-else name="i-lucide-database-zap" class="size-9 text-error" />

        <div class="space-y-1">
          <h1 class="text-lg font-semibold text-highlighted">
            {{ databaseLoading ? t('startup.databaseLoading') : t('startup.databaseError') }}
          </h1>
          <p class="max-w-sm text-sm text-muted">
            {{ databaseLoading ? t('startup.databaseLoadingSubtitle') : databaseError }}
          </p>
        </div>

        <UButton
          v-if="!databaseLoading"
          color="neutral"
          variant="soft"
          :label="t('startup.retry')"
          @click="initializeDatabase"
        />
      </div>
    </section>

    <RouterView v-else-if="route.meta.public" />
    <div v-else class="flex flex-1 h-screen">
      <AppSidebar v-model:open="open" />

      <div class="flex-1 flex flex-col">
        <div class="h-(--ui-header-height) shrink-0 flex items-center px-4 border-b border-default">
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            :aria-label="t('layout.toggleSidebar')"
            @click="open = !open"
          />
        </div>

        <main class="flex-1 overflow-auto p-4">
          <RouterView />
        </main>
      </div>
    </div>
  </UApp>
</template>