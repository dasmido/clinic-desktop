import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SettingsGeneralView from './views/SettingsGeneralView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomeView
    },
    {
      path: '/settings/general',
      component: SettingsGeneralView
    }
  ]
})