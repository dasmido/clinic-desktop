import { ref } from 'vue'
import type { AppSettings } from '@/modules/clinic-data'

const settings = ref<AppSettings | null>(null)
const isLoading = ref(false)

async function loadSettings() {
  isLoading.value = true
  try {
    settings.value = await window.electronAPI.settings.get()
    return settings.value
  } finally {
    isLoading.value = false
  }
}

async function updateSettings(input: Parameters<typeof window.electronAPI.settings.update>[0]) {
  settings.value = await window.electronAPI.settings.update(input)
  return settings.value
}

export function useAppSettings() {
  return { settings, isLoading, loadSettings, updateSettings }
}
