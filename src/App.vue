<script setup lang="ts">
import { ref } from 'vue'
import { ar } from '@nuxt/ui/locale'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const open = ref(true)
</script>

<template>
  <UApp :locale="ar">
    <RouterView v-if="route.meta.public" />
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