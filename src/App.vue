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

async function waitForElectronAPI(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now()
  while (!window.electronAPI) {
    if (Date.now() - start > timeoutMs) return false
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return true
}

async function initializeDatabase() {
  databaseError.value = ''
  databaseLoading.value = true

  try {
    const ready = await waitForElectronAPI()
    if (!ready) {
      throw new Error('تعذر الاتصال بـ Electron API. يرجى إعادة محاولة التشغيل.')
    }

    // The main process bounds its own Postgres startup with a timeout, but guard here too
    // so a stuck IPC call can never leave the UI spinning forever on a blank screen.
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('تعذر تجهيز قاعدة البيانات في الوقت المحدد. يرجى إعادة المحاولة.')), 45000)
    })
    await Promise.race([window.electronAPI.database.isReady(), timeout])
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

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="h-(--ui-header-height) shrink-0 flex items-center px-4 border-b border-default">
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            :aria-label="t('layout.toggleSidebar')"
            @click="open = !open"
          />
        </div>

        <main class="min-w-0 flex-1 overflow-auto p-4">
          <RouterView />
        </main>
      </div>
    </div>
  </UApp>
</template>