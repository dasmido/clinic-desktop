import type { RouteRecordRaw } from 'vue-router'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/register',
    component: RegisterView,
    meta: { public: true }
  }
]