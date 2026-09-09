import type { RouteRecordRaw } from 'vue-router'
import AppointmentsView from './views/AppointmentsView.vue'
import FinanceView from './views/FinanceView.vue'
import PatientsView from './views/PatientsView.vue'

export const clinicSectionRoutes: RouteRecordRaw[] = [
  {
    path: '/patients',
    component: PatientsView
  },
  {
    path: '/appointments',
    component: AppointmentsView
  },
  {
    path: '/finance',
    component: FinanceView
  }
]