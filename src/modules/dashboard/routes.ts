import type { RouteRecordRaw } from 'vue-router'
import HomeView from './views/HomeView.vue'

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: HomeView
  }
]