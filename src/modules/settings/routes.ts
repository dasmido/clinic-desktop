import type { RouteRecordRaw } from 'vue-router'
import SettingsGeneralView from './views/SettingsGeneralView.vue'
import SettingsUsersView from './views/SettingsUsersView.vue'

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/general',
    component: SettingsGeneralView
  },
  {
    path: '/settings/users',
    component: SettingsUsersView
  }
]