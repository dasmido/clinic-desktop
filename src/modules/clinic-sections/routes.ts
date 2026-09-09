import type { RouteRecordRaw } from 'vue-router'
import SectionView from './views/SectionView.vue'

export const clinicSectionRoutes: RouteRecordRaw[] = [
  {
    path: '/patients',
    component: SectionView,
    props: { titleKey: 'sections.patients' }
  },
  {
    path: '/appointments',
    component: SectionView,
    props: { titleKey: 'sections.appointments' }
  },
  {
    path: '/finance',
    component: SectionView,
    props: { titleKey: 'sections.finance' }
  }
]