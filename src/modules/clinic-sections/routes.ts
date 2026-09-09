import type { RouteRecordRaw } from 'vue-router'
import SectionView from './views/SectionView.vue'
import AppointmentsView from './views/AppointmentsView.vue'
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
    component: SectionView,
    props: { titleKey: 'sections.finance' }
  }
]