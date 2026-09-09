import type { RouteRecordRaw } from 'vue-router'
import SettingsGeneralView from './views/SettingsGeneralView.vue'

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/general',
    component: SettingsGeneralView
  }
]